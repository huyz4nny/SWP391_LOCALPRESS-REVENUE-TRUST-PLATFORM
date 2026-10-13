package com.localpress.content.service;

import com.localpress.content.entity.Article;
import com.localpress.content.entity.ArticleVersion;
import com.localpress.content.repository.ArticleRepository;
import com.localpress.content.repository.ArticleVersionRepository;
import com.localpress.content.repository.CategoryRepository;
import com.localpress.identity.entity.User;
import com.localpress.identity.service.CurrentUserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MyArticlesTest {
    @Mock ArticleRepository articleRepository;
    @Mock ArticleVersionRepository articleVersionRepository;
    @Mock CategoryRepository categoryRepository;
    @Mock CurrentUserService currentUserService;
    @InjectMocks ArticleDraftService service;

    User author() {
        User user = User.createReader("Author", "author@example.test", "unused", null);
        ReflectionTestUtils.setField(user, "id", 4L);
        ReflectionTestUtils.setField(user, "role", User.Role.AUTHOR);
        when(currentUserService.requireCurrentAuthor()).thenReturn(user);
        return user;
    }

    @Test void listsOnlyArticlesQueriedForAuthenticatedOwner() {
        author();
        Article article = Article.createDraft(2L, 4L, "draft-test");
        ReflectionTestUtils.setField(article, "id", 6L);
        article.advanceDraftVersion(1);
        ArticleVersion version = ArticleVersion.createDraft(6L, 4L, 1, "My title", "Sapo", "Content", null);
        when(articleRepository.findByAuthorIdOrderByUpdatedAtDesc(4L)).thenReturn(List.of(article));
        when(articleVersionRepository.findByArticleIdAndVersionNumber(6L, 1)).thenReturn(Optional.of(version));
        when(categoryRepository.findById(2L)).thenReturn(Optional.empty());
        var result = service.getMyArticles();
        assertEquals(1, result.size());
        assertEquals("4", result.get(0).authorId());
        assertEquals("My title", result.get(0).title());
        verify(articleRepository).findByAuthorIdOrderByUpdatedAtDesc(4L);
        verifyNoMoreInteractions(articleRepository);
    }

    @Test void returnsEmptyListForOwnerWithoutArticles() {
        author();
        when(articleRepository.findByAuthorIdOrderByUpdatedAtDesc(4L)).thenReturn(List.of());
        assertTrue(service.getMyArticles().isEmpty());
        verifyNoInteractions(articleVersionRepository, categoryRepository);
    }

    @Test void openingAnotherOwnersDraftReturnsNotFound() {
        author();
        when(articleRepository.findByIdAndAuthorId(99L, 4L)).thenReturn(Optional.empty());
        var error = assertThrows(ResponseStatusException.class, () -> service.getDraft(99L));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
        verifyNoInteractions(articleVersionRepository);
    }
}
