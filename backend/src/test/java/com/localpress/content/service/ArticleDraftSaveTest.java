package com.localpress.content.service;

import com.localpress.content.dto.*;
import com.localpress.content.entity.*;
import com.localpress.content.repository.*;
import com.localpress.identity.entity.User;
import com.localpress.identity.service.CurrentUserService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ArticleDraftSaveTest {
    @Mock ArticleDraftService articleDraftService;
    @Mock ArticleRepository articleRepository;
    @Mock ArticleVersionRepository articleVersionRepository;
    @Mock CategoryRepository categoryRepository;
    @Mock CurrentUserService currentUserService;
    @Mock ArticleMediaService articleMediaService;
    @Mock ArticleImageCleanupService articleImageCleanupService;
    @InjectMocks ArticleDraftSaveService service;

    SaveArticleDraftRequest request(boolean premium, BigDecimal price) {
        return new SaveArticleDraftRequest(2L,"New title","New sapo","New content",null,
                List.of("Hai Phong"),premium,price,"Update",null);
    }
    Article owner() {
        User user=User.createReader("Author","author@example.test","unused",null);
        ReflectionTestUtils.setField(user,"id",4L);
        when(currentUserService.requireCurrentAuthor()).thenReturn(user);
        Article article=Article.createDraft(2L,4L,"draft-test");
        ReflectionTestUtils.setField(article,"id",8L); article.advanceDraftVersion(1);
        return article;
    }
    ArticleVersion ready(Article article) {
        when(articleRepository.findOwnedArticleForUpdate(8L,4L)).thenReturn(Optional.of(article));
        ArticleVersion version=ArticleVersion.createDraft(8L,4L,1,"Old title","Old sapo","Old content","Original source");
        when(articleVersionRepository.findVersionForUpdate(8L,1)).thenReturn(Optional.of(version));
        return version;
    }
    void category() throws Exception {
        var ctor=Category.class.getDeclaredConstructor(); ctor.setAccessible(true);
        Category category=ctor.newInstance();
        ReflectionTestUtils.setField(category,"id",2L);
        ReflectionTestUtils.setField(category,"status",Category.Status.ACTIVE);
        when(categoryRepository.findById(2L)).thenReturn(Optional.of(category));
    }
    @Test void savesContentWithoutCreatingAnotherVersionAndPreservesSource() throws Exception {
        Article article=owner(); ArticleVersion version=ready(article); category();
        var result=service.update(8L,request(false,BigDecimal.ZERO),null,null);
        assertEquals("New title",result.title()); assertEquals("New content",result.content());
        assertEquals("Original source",result.source()); assertEquals(1,result.latestVersion());
        assertEquals(List.of("Hai Phong"),result.tags());
        verify(articleVersionRepository).saveAndFlush(version);
        verifyNoInteractions(articleDraftService,articleMediaService);
    }
    @Test void anotherOwnersArticleIsNotFound() {
        owner(); when(articleRepository.findOwnedArticleForUpdate(8L,4L)).thenReturn(Optional.empty());
        var error=assertThrows(ResponseStatusException.class,()->service.update(8L,request(false,BigDecimal.ZERO),null,null));
        assertEquals(404,error.getStatusCode().value());
        verifyNoInteractions(articleVersionRepository,categoryRepository,articleMediaService);
    }
    @Test void publishedArticleCannotBeModified() {
        Article article=owner();article.setStatus(Article.Status.PUBLISHED);
        when(articleRepository.findOwnedArticleForUpdate(8L,4L)).thenReturn(Optional.of(article));
        var error=assertThrows(ResponseStatusException.class,()->service.update(8L,request(false,BigDecimal.ZERO),null,null));
        assertEquals(409,error.getStatusCode().value());verifyNoInteractions(articleVersionRepository);
    }
    @Test void pendingVersionCannotBeModified() {
        Article article=owner();ArticleVersion version=ready(article);version.submitForReview();
        var error=assertThrows(ResponseStatusException.class,()->service.update(8L,request(false,BigDecimal.ZERO),null,null));
        assertEquals(409,error.getStatusCode().value());verifyNoInteractions(categoryRepository);
    }
    @Test void premiumPriceMustBePositiveBeforeContentChanges() throws Exception {
        Article article=owner();ArticleVersion version=ready(article);category();
        var error=assertThrows(ResponseStatusException.class,()->service.update(8L,request(true,BigDecimal.ZERO),null,null));
        assertEquals(400,error.getStatusCode().value());assertEquals("Old content",version.getContent());
        verify(articleRepository,never()).saveAndFlush(any());
    }
    @Test void coverUploadUsesSameDraftAndReturnsStoredUrl() throws Exception {
        Article article=owner();ArticleVersion version=ready(article);category();
        var file=new MockMultipartFile("file","cover.png","image/png",new byte[]{1});
        var info=new CoverImageInfoRequest("Caption","Alt","Source");
        when(articleMediaService.uploadCoverImage(8L,file,info)).thenAnswer(call->{
            version.updateDraftCoverImage("/api/v1/content/images/test.png","Caption","Alt","Source");
            return version.getCoverImageUrl();
        });
        var result=service.update(8L,request(false,BigDecimal.ZERO),file,info);
        assertEquals("/api/v1/content/images/test.png",result.coverImageUrl());
        verify(articleMediaService).uploadCoverImage(8L,file,info);
    }
}
