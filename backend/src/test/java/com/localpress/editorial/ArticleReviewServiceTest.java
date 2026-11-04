package com.localpress.editorial;

import com.localpress.content.entity.Article;
import com.localpress.content.entity.ArticleVersion;
import com.localpress.content.entity.Category;
import com.localpress.content.repository.ArticleRepository;
import com.localpress.content.repository.ArticleVersionRepository;
import com.localpress.content.repository.CategoryRepository;
import com.localpress.content.service.ImageStorageService;
import com.localpress.editorial.dto.EditorialArticleDto;
import com.localpress.editorial.dto.SaveEditorialArticleRequest;
import com.localpress.editorial.dto.UpdateArticleStatusRequest;
import com.localpress.editorial.service.ArticleReviewService;
import com.localpress.identity.entity.User;
import com.localpress.identity.repository.UserRepository;
import com.localpress.shared.event.ArticlePublishedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ArticleReviewServiceTest {

    @Mock
    private ArticleRepository articleRepository;

    @Mock
    private ArticleVersionRepository versionRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private ImageStorageService imageStorageService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private ArticleReviewService articleReviewService;

    private User authorUser;
    private User otherAuthorUser;
    private User editorUser;
    private Category activeCategory;
    private Article draftArticle;
    private ArticleVersion draftVersion;

    @BeforeEach
    void setUp() throws Exception {
        authorUser = User.createReader("Author One", "author1@localpress.vn", "hash", "0901234567");
        ReflectionTestUtils.setField(authorUser, "id", 10L);
        ReflectionTestUtils.setField(authorUser, "role", User.Role.AUTHOR);

        otherAuthorUser = User.createReader("Author Two", "author2@localpress.vn", "hash", "0901234568");
        ReflectionTestUtils.setField(otherAuthorUser, "id", 20L);
        ReflectionTestUtils.setField(otherAuthorUser, "role", User.Role.AUTHOR);

        editorUser = User.createReader("Editor Guy", "editor@localpress.vn", "hash", "0901234569");
        ReflectionTestUtils.setField(editorUser, "id", 30L);
        ReflectionTestUtils.setField(editorUser, "role", User.Role.EDITOR);

        var ctor = Category.class.getDeclaredConstructor();
        ctor.setAccessible(true);
        activeCategory = ctor.newInstance();
        ReflectionTestUtils.setField(activeCategory, "id", 1L);
        ReflectionTestUtils.setField(activeCategory, "slug", "thoi-su");
        ReflectionTestUtils.setField(activeCategory, "name", "Thời sự");
        ReflectionTestUtils.setField(activeCategory, "status", Category.Status.ACTIVE);

        draftArticle = Article.createDraft(1L, 10L, "bai-viet-thu-nghiem");
        ReflectionTestUtils.setField(draftArticle, "id", 100L);
        draftArticle.advanceDraftVersion(1);

        draftVersion = ArticleVersion.createDraft(100L, 10L, 1, "Tiêu đề nháp", "Sapo", "Nội dung", "Khởi tạo");
        ReflectionTestUtils.setField(draftVersion, "id", 500L);
    }

    @Test
    @DisplayName("Point 1: updateArticle trả 409 CONFLICT khi bài viết không ở trạng thái DRAFT")
    void updateArticle_whenArticleNotInDraft_throws409Conflict() {
        draftArticle.setStatus(Article.Status.PENDING); // đã gửi duyệt, không còn là DRAFT

        when(userRepository.findByEmail("author1@localpress.vn")).thenReturn(Optional.of(authorUser));
        when(articleRepository.findById(100L)).thenReturn(Optional.of(draftArticle));

        SaveEditorialArticleRequest req = SaveEditorialArticleRequest.builder()
                .title("Cập nhật khi đang chờ duyệt")
                .content("Nội dung mới")
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                articleReviewService.updateArticle(100L, req, null, null, "author1@localpress.vn")
        );
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("trạng thái bản nháp"));
    }

    @Test
    @DisplayName("Point 1: updateArticle trả 409 CONFLICT khi phiên bản mới nhất không ở trạng thái DRAFT")
    void updateArticle_whenVersionNotInDraft_throws409Conflict() {
        draftVersion.submitForReview(); // phiên bản PENDING

        when(userRepository.findByEmail("author1@localpress.vn")).thenReturn(Optional.of(authorUser));
        when(articleRepository.findById(100L)).thenReturn(Optional.of(draftArticle));
        when(versionRepository.findByArticleIdAndVersionNumber(100L, 1)).thenReturn(Optional.of(draftVersion));

        SaveEditorialArticleRequest req = SaveEditorialArticleRequest.builder()
                .title("Cập nhật khi phiên bản chờ duyệt")
                .content("Nội dung mới")
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                articleReviewService.updateArticle(100L, req, null, null, "author1@localpress.vn")
        );
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        assertTrue(ex.getReason().contains("trạng thái bản nháp"));
    }

    @Test
    @DisplayName("Point 2: updateArticle chặn 403 FORBIDDEN khi AUTHOR sửa bài của tác giả khác")
    void updateArticle_whenAuthorEditsOtherAuthorArticle_throws403Forbidden() {
        // author2 cố sửa bài của author1 (authorId = 10L)
        when(userRepository.findByEmail("author2@localpress.vn")).thenReturn(Optional.of(otherAuthorUser));
        when(articleRepository.findById(100L)).thenReturn(Optional.of(draftArticle));

        SaveEditorialArticleRequest req = SaveEditorialArticleRequest.builder()
                .title("Tác giả 2 sửa trộm bài tác giả 1")
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                articleReviewService.updateArticle(100L, req, null, null, "author2@localpress.vn")
        );
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertTrue(ex.getReason().contains("chỉ được chỉnh sửa bài viết của chính mình"));
    }

    @Test
    @DisplayName("Point 2: updateArticle cho phép EDITOR sửa bài viết của AUTHOR khác")
    void updateArticle_whenEditorEditsArticle_success() {
        when(userRepository.findByEmail("editor@localpress.vn")).thenReturn(Optional.of(editorUser));
        when(articleRepository.findById(100L)).thenReturn(Optional.of(draftArticle));
        when(versionRepository.findByArticleIdAndVersionNumber(100L, 1)).thenReturn(Optional.of(draftVersion));
        when(articleRepository.save(any(Article.class))).thenReturn(draftArticle);

        SaveEditorialArticleRequest req = SaveEditorialArticleRequest.builder()
                .title("Biên tập viên chỉnh sửa tiêu đề")
                .sapo("Sapo mới")
                .content("Nội dung mới")
                .build();

        EditorialArticleDto dto = articleReviewService.updateArticle(100L, req, null, null, "editor@localpress.vn");
        assertNotNull(dto);
        assertEquals("Biên tập viên chỉnh sửa tiêu đề", draftVersion.getTitle());
    }

    @Test
    @DisplayName("Point 3: resolveCategoryId trả 400 BAD REQUEST khi chuyên mục không tồn tại")
    void createArticle_whenCategoryNotFound_throws400BadRequest() {
        when(userRepository.findByEmail("author1@localpress.vn")).thenReturn(Optional.of(authorUser));
        when(categoryRepository.findBySlug("khong-ton-tai")).thenReturn(Optional.empty());

        SaveEditorialArticleRequest req = SaveEditorialArticleRequest.builder()
                .title("Bài viết chuyên mục rác")
                .categoryId("khong-ton-tai")
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                articleReviewService.createArticle(req, null, null, "author1@localpress.vn")
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("Chuyên mục không tồn tại"));
    }

    @Test
    @DisplayName("Point 3: Bài Premium thiếu giá hoặc giá <= 0 trả 400 BAD REQUEST")
    void createArticle_whenPremiumWithZeroPrice_throws400BadRequest() {
        when(userRepository.findByEmail("author1@localpress.vn")).thenReturn(Optional.of(authorUser));
        when(categoryRepository.findBySlug("thoi-su")).thenReturn(Optional.of(activeCategory));

        SaveEditorialArticleRequest req = SaveEditorialArticleRequest.builder()
                .title("Bài viết Premium không giá")
                .categoryId("thoi-su")
                .isPremium(true)
                .price(BigDecimal.ZERO)
                .build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                articleReviewService.createArticle(req, null, null, "author1@localpress.vn")
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        assertTrue(ex.getReason().contains("giá bán lớn hơn 0"));
    }

    @Test
    @DisplayName("Point 6: updateArticleStatus sang PUBLISHED phát sự kiện ArticlePublishedEvent")
    void updateArticleStatus_whenPublished_publishesArticlePublishedEvent() {
        draftArticle.setStatus(Article.Status.PENDING);
        ReflectionTestUtils.setField(draftArticle, "publishedVersion", null);

        when(userRepository.findByEmail("editor@localpress.vn")).thenReturn(Optional.of(editorUser));
        when(articleRepository.findById(100L)).thenReturn(Optional.of(draftArticle));
        when(versionRepository.findByArticleIdAndVersionNumber(100L, 1)).thenReturn(Optional.of(draftVersion));
        when(articleRepository.save(any(Article.class))).thenReturn(draftArticle);

        UpdateArticleStatusRequest req = new UpdateArticleStatusRequest();
        req.setStatus("PUBLISHED");
        req.setReviewNotes("Duyệt và xuất bản bài");
        req.setAccessType("FREE");
        req.setSinglePrice(BigDecimal.ZERO);

        articleReviewService.updateArticleStatus(100L, req, "editor@localpress.vn");

        ArgumentCaptor<ArticlePublishedEvent> eventCaptor = ArgumentCaptor.forClass(ArticlePublishedEvent.class);
        verify(eventPublisher, times(1)).publishEvent(eventCaptor.capture());

        ArticlePublishedEvent captured = eventCaptor.getValue();
        assertNotNull(captured);
        assertEquals(100L, captured.getArticleId());
        assertEquals(1L, captured.getCategoryId());
        assertEquals(1, captured.getVersionNumber());
        assertEquals(draftVersion.getTitle(), captured.getTitle());
        assertTrue(captured.isFirstPublication());
        assertNotNull(captured.getPublishedAt());
    }
}
