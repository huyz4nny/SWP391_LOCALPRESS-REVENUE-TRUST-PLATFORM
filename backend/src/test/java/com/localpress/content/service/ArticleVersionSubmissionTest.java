package com.localpress.content.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.content.entity.Article;
import com.localpress.content.entity.ArticleVersion;
import com.localpress.content.repository.ArticleRepository;
import com.localpress.content.repository.ArticleVersionRepository;
import com.localpress.identity.entity.User;
import com.localpress.identity.service.CurrentUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import jakarta.persistence.EntityManager;
import com.localpress.content.dto.RestoreArticleVersionRequest;
import java.util.concurrent.atomic.AtomicReference;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ArticleVersionSubmissionTest {
    @Mock ArticleRepository articles;
    @Mock ArticleVersionRepository versions;
    @Mock CurrentUserService currentUser;
    @Spy ObjectMapper objectMapper = new ObjectMapper();
    @Mock EntityManager entityManager;
    @InjectMocks ArticleVersionService service;

    @BeforeEach void authenticatedAuthor() {
        ReflectionTestUtils.setField(service, "entityManager", entityManager);
        User author = User.createReader("Author", "author@example.test", "unused", null);
        ReflectionTestUtils.setField(author, "id", 4L);
        ReflectionTestUtils.setField(author, "role", User.Role.AUTHOR);
        when(currentUser.requireCurrentAuthor()).thenReturn(author);
    }

    private Article article() {
        Article article = Article.createDraft(2L, 4L, "submission-test");
        ReflectionTestUtils.setField(article, "id", 1L);
        ReflectionTestUtils.setField(article, "latestVersion", 5);
        return article;
    }

    private ArticleVersion draft(String title, String content) {
        return ArticleVersion.createDraft(1L, 4L, 5, title, "Sapo", content, null);
    }

    private void locked(Article article, ArticleVersion version) {
        when(articles.findOwnedArticleForUpdate(1L, 4L)).thenReturn(Optional.of(article));
        when(versions.findVersionForUpdate(1L, 5)).thenReturn(Optional.of(version));
    }

    private void readable(Article article, ArticleVersion version) {
        when(articles.findByIdAndAuthorId(1L, 4L)).thenReturn(Optional.of(article));
        when(versions.findByArticleIdAndVersionNumber(1L, 5)).thenReturn(Optional.of(version));
    }

    @Test void rejectedArticleCanBeRevisedAndResubmittedWithoutOverwritingFeedback() {
        reviseAndResubmit(false);
    }

    @Test void rejectedRevisionCanBeResubmittedWhilePublishedVersionRemainsLive() {
        reviseAndResubmit(true);
    }

    private void reviseAndResubmit(boolean published) {
        Article article = article();
        if (published) article.publish(1, "FREE", null);
        ArticleVersion rejected = draft("Returned draft", "Original content");
        rejected.reject(2L, "Bổ sung nguồn và số liệu");
        article.rejectReview();
        locked(article, rejected);
        AtomicReference<ArticleVersion> saved = new AtomicReference<>();
        when(versions.saveAndFlush(any())).thenAnswer(invocation -> {
            ArticleVersion value = invocation.getArgument(0);
            saved.set(value);
            return value;
        });
        when(articles.findByIdAndAuthorId(1L, 4L)).thenReturn(Optional.of(article));
        when(versions.findByArticleIdAndVersionNumber(1L, 6)).thenAnswer(ignored -> Optional.of(saved.get()));

        var restored = service.restoreVersion(1L, 5,
                new RestoreArticleVersionRequest(5, "Sửa theo phản hồi kiểm duyệt"));
        assertEquals(6, restored.versionNumber());
        assertEquals("DRAFT", restored.reviewStatus());
        assertEquals("Bổ sung nguồn và số liệu", rejected.getReviewFeedback());
        assertEquals(ArticleVersion.ReviewStatus.REJECTED, rejected.getReviewStatus());
        assertEquals("Original content", rejected.getContent());
        assertNull(saved.get().getReviewFeedback());
        assertNull(saved.get().getReviewedAt());
        assertNull(saved.get().getSubmittedAt());

        // A stale second click cannot allocate another version.
        var conflict = assertThrows(ResponseStatusException.class, () -> service.restoreVersion(1L, 5,
                new RestoreArticleVersionRequest(5, "Sửa theo phản hồi kiểm duyệt")));
        assertEquals(HttpStatus.CONFLICT, conflict.getStatusCode());
        assertEquals(6, article.getLatestVersion());

        ArticleVersion revision = saved.get();
        revision.updateDraftContent("Revised title", "Sapo", "Corrected content", "Bổ sung nguồn");
        when(versions.findVersionForUpdate(1L, 6)).thenReturn(Optional.of(revision));
        var submitted = service.submitVersionForReview(1L, 6);
        assertEquals("PENDING", submitted.reviewStatus());
        assertEquals("Corrected content", submitted.content());
        assertEquals(published ? Article.Status.PUBLISHED : Article.Status.PENDING, article.getStatus());
        assertEquals(published ? Integer.valueOf(1) : null, article.getPublishedVersion());
        assertEquals(ArticleVersion.ReviewStatus.REJECTED, rejected.getReviewStatus());
        verify(entityManager).refresh(revision);
    }

    @Test void publishedArticleKeepsItsPublishedVersionWhileRevisionBecomesPending() {
        Article article = article();
        article.publish(1, "FREE", null);
        ArticleVersion version = draft("Revision", "Saved content");
        locked(article, version);
        readable(article, version);

        var response = service.submitVersionForReview(1L, 5);

        assertEquals("PENDING", response.reviewStatus());
        assertTrue(response.latest());
        assertFalse(response.published());
        assertNotNull(version.getSubmittedAt());
        assertEquals(Article.Status.PUBLISHED, article.getStatus());
        assertEquals(1, article.getPublishedVersion());
        assertEquals(5, article.getLatestVersion());
        verify(versions).saveAndFlush(version);
        verify(articles).saveAndFlush(article);
    }

    @Test void unpublishedDraftArticleBecomesPendingWithoutCreatingANewVersion() {
        Article article = article();
        ArticleVersion version = draft("Draft", "Saved content");
        locked(article, version);
        readable(article, version);

        service.submitVersionForReview(1L, 5);

        assertEquals(Article.Status.PENDING, article.getStatus());
        assertEquals(ArticleVersion.ReviewStatus.PENDING, version.getReviewStatus());
        assertNull(article.getPublishedVersion());
        assertEquals(5, article.getLatestVersion());
    }

    @Test void staleVersionReturnsConflictBeforeLockingVersion() {
        when(articles.findOwnedArticleForUpdate(1L, 4L)).thenReturn(Optional.of(article()));
        var error = assertThrows(ResponseStatusException.class,
                () -> service.submitVersionForReview(1L, 4));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        verifyNoInteractions(versions);
    }

    @Test void anotherOwnersArticleReturnsNotFound() {
        when(articles.findOwnedArticleForUpdate(1L, 4L)).thenReturn(Optional.empty());
        var error = assertThrows(ResponseStatusException.class,
                () -> service.submitVersionForReview(1L, 5));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
        verifyNoInteractions(versions);
    }

    @Test void pendingVersionCannotBeSubmittedAgain() {
        Article article = article();
        ArticleVersion version = draft("Draft", "Saved content");
        version.submitForReview();
        locked(article, version);
        var error = assertThrows(ResponseStatusException.class,
                () -> service.submitVersionForReview(1L, 5));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        verify(versions, never()).saveAndFlush(any());
    }

    @Test void blankTitleIsRejectedWithoutChangingReviewStatus() {
        ArticleVersion version = draft("  ", "Saved content");
        locked(article(), version);
        var error = assertThrows(ResponseStatusException.class,
                () -> service.submitVersionForReview(1L, 5));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        assertEquals(ArticleVersion.ReviewStatus.DRAFT, version.getReviewStatus());
        verify(versions, never()).saveAndFlush(any());
    }

    @Test void blankContentIsRejectedWithoutChangingReviewStatus() {
        ArticleVersion version = draft("Draft", "  ");
        locked(article(), version);
        var error = assertThrows(ResponseStatusException.class,
                () -> service.submitVersionForReview(1L, 5));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        assertEquals(ArticleVersion.ReviewStatus.DRAFT, version.getReviewStatus());
        verify(versions, never()).saveAndFlush(any());
    }
}
