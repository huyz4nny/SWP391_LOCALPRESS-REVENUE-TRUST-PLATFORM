package com.localpress.content.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.content.dto.*;
import com.localpress.content.entity.*;
import com.localpress.content.repository.*;
import com.localpress.identity.entity.User;
import com.localpress.identity.service.CurrentUserService;
import jakarta.persistence.EntityManager;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EditorialArticleCompatibilityServiceTest {
    @Mock private CurrentUserService currentUserService;
    @Mock private ArticleDraftService articleDraftService;
    @Mock private ArticleRepository articleRepository;
    @Mock private ArticleVersionRepository versionRepository;
    @Mock private CategoryRepository categoryRepository;
    @Mock private EntityManager entityManager;
    @Mock private ArticleMediaService articleMediaService;
    @InjectMocks private EditorialArticleCompatibilityService service;

    private User editor;
    private Article article;
    private ArticleVersion version;
    private Category category;

    @BeforeEach
    void fixtures() {
        editor = User.createReader("Editor", "editor@example.test", "unused", null);
        ReflectionTestUtils.setField(editor, "id", 4L);
        ReflectionTestUtils.setField(editor, "role", User.Role.EDITOR);
        when(currentUserService.requireCurrentEditor()).thenReturn(editor);
        article = Article.createDraft(1L, 4L, "draft-test");
        ReflectionTestUtils.setField(article, "id", 6L);
        ReflectionTestUtils.setField(article, "createdAt", LocalDateTime.of(2026, 10, 12, 12, 0));
        ReflectionTestUtils.setField(article, "updatedAt", article.getCreatedAt());
        article.advanceDraftVersion(1);
        version = ArticleVersion.createDraft(6L, 4L, 1, "Title", "Sapo", "Content", null);
        ReflectionTestUtils.setField(version, "id", 10L);
        ReflectionTestUtils.setField(version, "createdAt", article.getCreatedAt());
        category = org.springframework.beans.BeanUtils.instantiateClass(Category.class);
        ReflectionTestUtils.setField(category, "id", 1L);
        ReflectionTestUtils.setField(category, "slug", "thoi-su");
        ReflectionTestUtils.setField(category, "name", "Thời sự");
        ReflectionTestUtils.setField(category, "status", Category.Status.ACTIVE);
    }

    @Test
    void existingFePayloadCreatesRealDraftAndReturnsItsExpectedFields() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        EditorialArticleRequest request = mapper.readValue("""
                {"title":"Title","sapo":"Sapo","content":"Content",
                 "previewContent":"Sapo","categoryId":"cat-thoi-su",
                 "categoryName":"Untrusted client name","categorySlug":"untrusted",
                 "coverImage":"https://example.test/cover.png","tags":["Hải Phòng"],
                 "isPremium":true,"price":15000,"status":"DRAFT"}
                """, EditorialArticleRequest.class);
        categoryLookups();
        when(articleDraftService.createDraft(any())).thenReturn(article);
        when(versionRepository.findByArticleIdAndVersionNumber(6L, 1)).thenReturn(Optional.of(version));

        EditorialArticleResponse result = service.create(request);

        ArgumentCaptor<CreateArticleDraftRequest> capture = ArgumentCaptor.forClass(CreateArticleDraftRequest.class);
        verify(articleDraftService).createDraft(capture.capture());
        assertEquals(1L, capture.getValue().categoryId());
        assertEquals("4", result.authorId());
        assertEquals("Thời sự", result.categoryName());
        assertEquals("cat-thoi-su", result.categoryId());
        assertEquals(1, result.currentVersion());
        assertEquals("DRAFT", result.status());
        var json = mapper.valueToTree(result);
        assertTrue(json.get("isPremium").asBoolean());
        assertEquals("https://example.test/cover.png", json.get("coverImage").asText());
        assertEquals(15000, json.get("price").asInt());
        assertEquals("Hải Phòng", json.get("tags").get(0).asText());
        assertEquals("Content", json.get("versions").get(0).get("content").asText());
    }

    @Test
    void readingAnotherEditorsDraftDoesNotExposeContent() {
        when(articleRepository.findByIdAndAuthorId(6L, 4L)).thenReturn(Optional.empty());
        assertStatus(HttpStatus.NOT_FOUND, () -> service.getDraft(6L));
        verifyNoInteractions(versionRepository);
    }

    @Test
    void listIsRestrictedToCurrentEditorsDrafts() {
        when(articleRepository.findByAuthorIdAndStatusOrderByIdDesc(4L, Article.Status.DRAFT))
                .thenReturn(List.of(article));
        when(versionRepository.findByArticleIdAndVersionNumber(6L, 1)).thenReturn(Optional.of(version));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));

        assertEquals("6", service.getDrafts().get(0).id());
        verify(articleRepository).findByAuthorIdAndStatusOrderByIdDesc(4L, Article.Status.DRAFT);
    }

    @Test
    void submissionDoesNotCreateAPartialDraftOutsideIterationOne() {
        assertStatus(HttpStatus.CONFLICT, () -> service.create(request("Content", "IN_REVIEW")));
        verifyNoInteractions(articleDraftService, articleRepository, versionRepository);
    }

    @Test
    void changingContentIsRejectedWithoutSavingMetadata() {
        ownedLockedDraft();
        assertStatus(HttpStatus.CONFLICT, () -> service.updateMetadata(6L, request("Changed", "DRAFT")));
        verify(versionRepository, never()).saveAndFlush(any());
        verifyNoInteractions(categoryRepository, entityManager);
    }

    @Test
    void metadataUpdatePreservesTheExistingContentAndVersion() {
        ownedLockedDraft();
        categoryLookups();
        EditorialArticleResponse result = service.updateMetadata(6L, request("Content", "DRAFT"));

        assertEquals("Content", result.content());
        assertEquals(1, result.currentVersion());
        assertEquals(List.of("Hải Phòng"), result.tags());
        verify(versionRepository).saveAndFlush(version);
        verifyNoInteractions(articleDraftService);
    }

    @Test
    void unknownCategoryDoesNotSilentlyFallBackToAnExistingCategory() {
        when(categoryRepository.findBySlug("thoi-su")).thenReturn(Optional.empty());
        assertStatus(HttpStatus.BAD_REQUEST, () -> service.create(request("Content", "DRAFT")));
        verifyNoInteractions(articleDraftService);
    }

    @Test
    void creatingWithFileReturnsStoredImageAndItsMetadata() {
        categoryLookups();
        when(articleDraftService.createDraft(any())).thenReturn(article);
        when(versionRepository.findByArticleIdAndVersionNumber(6L, 1)).thenReturn(Optional.of(version));
        when(articleRepository.findByIdAndAuthorId(6L, 4L)).thenReturn(Optional.of(article));
        var file = new MockMultipartFile("file", "cover.png", "image/png", new byte[]{1});
        var info = new CoverImageInfoRequest("Caption", "Alt text", "Source");
        when(articleMediaService.uploadCoverImage(6L, file, info)).thenAnswer(call -> {
            version.updateDraftCoverImage("/api/v1/content/images/test.png", "Caption", "Alt text", "Source");
            return version.getCoverImageUrl();
        });

        EditorialArticleResponse response = service.createWithCoverImage(request("Content", "DRAFT"), file, info);

        assertEquals("/api/v1/content/images/test.png", response.coverImage());
        assertEquals("Caption", response.coverCaption());
        assertEquals("Alt text", response.coverAltText());
        assertEquals("Source", response.coverSource());
    }

    @Test
    void failedUploadTriggersRollbackOfTheOuterCreateTransaction() {
        categoryLookups();
        when(articleDraftService.createDraft(any())).thenReturn(article);
        when(versionRepository.findByArticleIdAndVersionNumber(6L, 1)).thenReturn(Optional.of(version));
        var file = new MockMultipartFile("file", "bad.png", "image/png", new byte[]{1});
        var info = new CoverImageInfoRequest(null, "Alt", null);
        when(articleMediaService.uploadCoverImage(6L, file, info))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid image"));
        PlatformTransactionManager manager = mock(PlatformTransactionManager.class);
        var transaction = new SimpleTransactionStatus();
        when(manager.getTransaction(any())).thenReturn(transaction);
        ProxyFactory factory = new ProxyFactory(service);
        factory.addAdvice(new TransactionInterceptor(manager, new AnnotationTransactionAttributeSource()));
        var transactionalService = (EditorialArticleCompatibilityService) factory.getProxy();

        assertStatus(HttpStatus.BAD_REQUEST,
                () -> transactionalService.createWithCoverImage(request("Content", "DRAFT"), file, info));

        verify(manager).rollback(transaction);
        verify(manager, never()).commit(any());
    }

    @Test
    void replacementKeepsOldUrlUntilMediaServiceCanCleanItUp() {
        version.updateDraftCoverImage("/api/v1/content/images/old.png", null, "Old alt", null);
        ownedLockedDraft();
        categoryLookups();
        when(articleRepository.findByIdAndAuthorId(6L, 4L)).thenReturn(Optional.of(article));
        when(versionRepository.findByArticleIdAndVersionNumber(6L, 1)).thenReturn(Optional.of(version));
        var file = new MockMultipartFile("file", "new.png", "image/png", new byte[]{1});
        var info = new CoverImageInfoRequest(null, "New alt", null);
        when(articleMediaService.uploadCoverImage(6L, file, info)).thenAnswer(call -> {
            assertEquals("/api/v1/content/images/old.png", version.getCoverImageUrl());
            version.updateDraftCoverImage("/api/v1/content/images/new.png", null, "New alt", null);
            return version.getCoverImageUrl();
        });

        var response = service.updateWithCoverImage(6L,
                new EditorialArticleUpdateRequest(request("Content", "DRAFT"), "Metadata", null), file, info);

        assertEquals("/api/v1/content/images/new.png", response.coverImage());
        assertEquals(1, response.currentVersion());
    }

    private void categoryLookups() {
        when(categoryRepository.findBySlug("thoi-su")).thenReturn(Optional.of(category));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
    }

    private void ownedLockedDraft() {
        when(articleRepository.findOwnedArticleForUpdate(6L, 4L)).thenReturn(Optional.of(article));
        when(versionRepository.findVersionForUpdate(6L, 1)).thenReturn(Optional.of(version));
    }

    private EditorialArticleRequest request(String content, String status) {
        return new EditorialArticleRequest("Title", "Sapo", content,
                "https://example.test/cover.png", "cat-thoi-su", List.of("Hải Phòng"),
                false, BigDecimal.ZERO, status, null);
    }

    private void assertStatus(HttpStatus expected, org.junit.jupiter.api.function.Executable action) {
        assertEquals(expected, assertThrows(ResponseStatusException.class, action).getStatusCode());
    }
}
