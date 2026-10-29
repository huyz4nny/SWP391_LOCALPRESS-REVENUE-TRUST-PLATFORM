package com.localpress.editorial;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.editorial.controller.EditorialArticleController;
import com.localpress.editorial.dto.EditorialArticleDto;
import com.localpress.editorial.dto.SaveEditorialArticleRequest;
import com.localpress.editorial.dto.UpdateArticleStatusRequest;
import com.localpress.editorial.service.ArticleReviewService;
import com.localpress.shared.security.SecurityConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EditorialArticleController.class)
@Import(SecurityConfig.class)
class EditorialArticleControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ArticleReviewService articleReviewService;

    @MockBean
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("GET /editorial/articles trả về danh sách bài viết cho EDITOR (200 OK)")
    @WithMockUser(roles = "EDITOR")
    void getAllArticles_successForEditor() throws Exception {
        EditorialArticleDto dto = EditorialArticleDto.builder()
                .id("100")
                .title("Bài viết thử nghiệm")
                .slug("bai-viet-thu-nghiem")
                .status("DRAFT")
                .authorName("Nguyễn Văn A")
                .createdAt(LocalDateTime.now())
                .build();

        when(articleReviewService.getAllArticles()).thenReturn(List.of(dto));

        mvc.perform(get("/api/v1/editorial/articles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("100"))
                .andExpect(jsonPath("$[0].title").value("Bài viết thử nghiệm"));
    }

    @Test
    @DisplayName("GET /editorial/articles/{id} trả về chi tiết bài viết cho AUTHOR (200 OK)")
    @WithMockUser(roles = "AUTHOR")
    void getArticleById_successForAuthor() throws Exception {
        EditorialArticleDto dto = EditorialArticleDto.builder()
                .id("100")
                .title("Chi tiết bài viết")
                .slug("chi-tiet-bai-viet")
                .status("DRAFT")
                .content("<p>Nội dung chi tiết</p>")
                .build();

        when(articleReviewService.getArticleById(100L)).thenReturn(dto);

        mvc.perform(get("/api/v1/editorial/articles/100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("100"))
                .andExpect(jsonPath("$.title").value("Chi tiết bài viết"));
    }

    @Test
    @DisplayName("POST /editorial/articles JSON tạo bản thảo bài viết mới (201 Created)")
    @WithMockUser(username = "phongvien@localpress.vn", roles = "AUTHOR")
    void createArticle_json_success() throws Exception {
        SaveEditorialArticleRequest req = new SaveEditorialArticleRequest();
        req.setTitle("Bản thảo mới từ Phóng viên");
        req.setContent("<p>Nội dung bản thảo</p>");
        req.setCategoryId("cat-thoi-su");

        EditorialArticleDto dto = EditorialArticleDto.builder()
                .id("101")
                .title("Bản thảo mới từ Phóng viên")
                .slug("ban-thao-moi-tu-phong-vien")
                .status("DRAFT")
                .build();

        when(articleReviewService.createArticle(any(SaveEditorialArticleRequest.class), any(), any(), anyString()))
                .thenReturn(dto);

        mvc.perform(post("/api/v1/editorial/articles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("101"))
                .andExpect(jsonPath("$.title").value("Bản thảo mới từ Phóng viên"));
    }

    @Test
    @DisplayName("POST /editorial/articles multipart tạo bản thảo kèm ảnh bìa (201 Created)")
    @WithMockUser(username = "bientap@localpress.vn", roles = "EDITOR")
    void createArticle_multipart_success() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "cover.jpg", "image/jpeg", "image-content".getBytes());
        MockMultipartFile articlePart = new MockMultipartFile(
                "article",
                "",
                "application/json",
                "{\"title\":\"Bài viết có ảnh bìa\",\"content\":\"Nội dung\"}".getBytes()
        );

        EditorialArticleDto dto = EditorialArticleDto.builder()
                .id("102")
                .title("Bài viết có ảnh bìa")
                .slug("bai-viet-co-anh-bia")
                .status("DRAFT")
                .coverImage("/uploads/cover.jpg")
                .build();

        when(articleReviewService.createArticle(any(), any(), any(), anyString())).thenReturn(dto);

        mvc.perform(multipart("/api/v1/editorial/articles")
                        .file(file)
                        .file(articlePart))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("102"))
                .andExpect(jsonPath("$.coverImage").value("/uploads/cover.jpg"));
    }

    @Test
    @DisplayName("PUT /editorial/articles/{id} cập nhật bản thảo bài viết (200 OK)")
    @WithMockUser(username = "bientap@localpress.vn", roles = "EDITOR")
    void updateArticle_json_success() throws Exception {
        SaveEditorialArticleRequest req = new SaveEditorialArticleRequest();
        req.setTitle("Tiêu đề cập nhật");
        req.setContent("<p>Nội dung cập nhật</p>");

        EditorialArticleDto dto = EditorialArticleDto.builder()
                .id("100")
                .title("Tiêu đề cập nhật")
                .slug("tieu-de-cap-nhat")
                .status("DRAFT")
                .build();

        when(articleReviewService.updateArticle(eq(100L), any(SaveEditorialArticleRequest.class), any(), any(), anyString()))
                .thenReturn(dto);

        mvc.perform(put("/api/v1/editorial/articles/100")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Tiêu đề cập nhật"));
    }

    @Test
    @DisplayName("POST /editorial/articles/{id}/status thành công cho EDITOR (200 OK)")
    @WithMockUser(username = "bientap@localpress.vn", roles = "EDITOR")
    void updateArticleStatus_successForEditor() throws Exception {
        UpdateArticleStatusRequest req = new UpdateArticleStatusRequest();
        req.setStatus("APPROVED");
        req.setReviewNotes("Bài viết đạt yêu cầu chất lượng");

        EditorialArticleDto dto = EditorialArticleDto.builder()
                .id("100")
                .status("APPROVED")
                .reviewNotes("Bài viết đạt yêu cầu chất lượng")
                .build();

        when(articleReviewService.updateArticleStatus(eq(100L), any(UpdateArticleStatusRequest.class), eq("bientap@localpress.vn")))
                .thenReturn(dto);

        mvc.perform(post("/api/v1/editorial/articles/100/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.reviewNotes").value("Bài viết đạt yêu cầu chất lượng"));
    }

    @Test
    @DisplayName("POST /editorial/articles/{id}/status bị CHẶN 403 Forbidden với vai trò AUTHOR")
    @WithMockUser(username = "phongvien@localpress.vn", roles = "AUTHOR")
    void updateArticleStatus_forbiddenForAuthor() throws Exception {
        UpdateArticleStatusRequest req = new UpdateArticleStatusRequest();
        req.setStatus("APPROVED");
        req.setReviewNotes("Tự duyệt bài");

        mvc.perform(post("/api/v1/editorial/articles/100/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /editorial/articles/{id}/status bị CHẶN 403 Forbidden với vai trò READER")
    @WithMockUser(username = "reader@gmail.com", roles = "READER")
    void updateArticleStatus_forbiddenForReader() throws Exception {
        UpdateArticleStatusRequest req = new UpdateArticleStatusRequest();
        req.setStatus("APPROVED");

        mvc.perform(post("/api/v1/editorial/articles/100/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());
    }
}
