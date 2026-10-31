package com.localpress.content.service;

import com.localpress.content.entity.Article;
import com.localpress.content.entity.ArticleVersion;
import com.localpress.content.repository.ArticleRepository;
import com.localpress.content.repository.ArticleVersionRepository;
import com.localpress.identity.entity.User;
import com.localpress.identity.service.CurrentUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ArticleReviewImageTest {
    final ArticleRepository articles=mock(ArticleRepository.class);
    final ArticleVersionRepository versions=mock(ArticleVersionRepository.class);
    final CurrentUserService current=mock(CurrentUserService.class);
    final ImageStorageService storage=mock(ImageStorageService.class);
    final ArticleMediaService service=new ArticleMediaService(articles,versions,current,storage,mock(ArticleImageCleanupService.class));
    final String filename="11111111-1111-1111-1111-111111111111.png";
    Article article;
    ArticleVersion version;

    @BeforeEach void setup() {
        article=Article.createDraft(2L,4L,"draft-review");
        ReflectionTestUtils.setField(article,"id",10L);
        version=ArticleVersion.createDraft(10L,4L,1,"Draft",null,"Body",null);
        version.updateDraftCoverImage("/api/v1/content/images/"+filename,"Caption","Alt","Source");
    }
    void identity(long id,User.Role role) {
        var user=User.createReader("User","user@example.test","unused",null);
        ReflectionTestUtils.setField(user,"id",id);ReflectionTestUtils.setField(user,"role",role);
        when(current.requireCurrentAuthor()).thenReturn(user);
    }
    void image() {
        when(articles.findById(10L)).thenReturn(Optional.of(article));
        when(versions.findByArticleIdAndVersionNumber(10L,1)).thenReturn(Optional.of(version));
        when(storage.load(filename)).thenReturn(new ByteArrayResource(new byte[]{1,2,3}));
    }
    @Test void editorCanReadAnotherAuthorsDraftImage() {
        identity(3L,User.Role.EDITOR);image();
        assertNotNull(service.getReviewCoverImage(10L,1));
        verify(storage).load(filename);
    }
    @Test void systemAdminCanReadImageOfTakenDownArticleForReview() {
        identity(1L,User.Role.SYSTEM_ADMIN);image();article.setStatus(Article.Status.TAKEN_DOWN);
        assertNotNull(service.getReviewCoverImage(10L,1));
    }
    @Test void ownerCanReadTheirOwnVersionImage() {
        identity(4L,User.Role.AUTHOR);image();
        assertNotNull(service.getReviewCoverImage(10L,1));
    }
    @Test void unrelatedAuthorCannotReadPrivateImageByChangingArticleId() {
        identity(9L,User.Role.AUTHOR);
        when(articles.findById(10L)).thenReturn(Optional.of(article));
        assertEquals(404,assertThrows(ResponseStatusException.class,()->service.getReviewCoverImage(10L,1)).getStatusCode().value());
        verifyNoInteractions(versions,storage);
    }
    @Test void imageMustBelongToTheRequestedVersion() {
        identity(3L,User.Role.EDITOR);
        when(articles.findById(10L)).thenReturn(Optional.of(article));
        assertEquals(404,assertThrows(ResponseStatusException.class,()->service.getReviewCoverImage(10L,999)).getStatusCode().value());
        verifyNoInteractions(storage);
    }
    @Test void externalUrlsAreNeverFetchedByTheServer() {
        identity(3L,User.Role.EDITOR);
        when(articles.findById(10L)).thenReturn(Optional.of(article));
        when(versions.findByArticleIdAndVersionNumber(10L,1)).thenReturn(Optional.of(version));
        version.updateDraftCoverImage("https://example.test/cover.png",null,"Alt",null);
        assertEquals(404,assertThrows(ResponseStatusException.class,()->service.getReviewCoverImage(10L,1)).getStatusCode().value());
        verifyNoInteractions(storage);
    }
}
