package com.localpress.reader;

import com.localpress.content.controller.ArticleDraftController;
import com.localpress.content.service.ArticleDraftService;
import com.localpress.reader.controller.ReaderArticleController;
import com.localpress.reader.dto.ArticleReaderResponse;
import com.localpress.reader.dto.ArticleSummaryResponse;
import com.localpress.reader.service.ReaderArticleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Hợp đồng route của API độc giả khi dùng chung prefix /api/v1/articles với CMS (SV5):
 * slug (có ít nhất 1 ký tự không phải số) thuộc Reader, id thuần số thuộc CMS.
 */
class ReaderArticleControllerTest {

    /** Giả lập đúng hợp đồng đã thống nhất cho route CMS: GET /api/v1/articles/{id:\d+}. */
    @RestController
    @RequestMapping("/api/v1/articles")
    static class CmsDraftContractStub {
        @GetMapping("/{id:\\d+}")
        public String draft(@PathVariable Long id) {
            return "cms-draft-" + id;
        }
    }

    private ReaderArticleService readerService;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        readerService = mock(ReaderArticleService.class);
        mvc = MockMvcBuilders
                .standaloneSetup(new ReaderArticleController(readerService), new CmsDraftContractStub())
                .build();
    }

    @Test
    void slugWithLettersIsHandledByReaderController() throws Exception {
        ArticleReaderResponse body = ArticleReaderResponse.builder()
                .id(3L).slug("hai-phong-thu-hut-fdi").title("FDI").isLocked(false).build();
        when(readerService.getArticleBySlug("hai-phong-thu-hut-fdi")).thenReturn(body);

        mvc.perform(get("/api/v1/articles/hai-phong-thu-hut-fdi"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("Vary", "Authorization"))
                .andExpect(jsonPath("$.slug").value("hai-phong-thu-hut-fdi"))
                .andExpect(jsonPath("$.isLocked").value(false));

        verify(readerService).getArticleBySlug("hai-phong-thu-hut-fdi");
    }

    @Test
    void slugEndingWithDigitsIsStillReaderSlug() throws Exception {
        when(readerService.getArticleBySlug("bai-viet-2026")).thenReturn(ArticleReaderResponse.builder().build());

        mvc.perform(get("/api/v1/articles/bai-viet-2026")).andExpect(status().isOk());

        verify(readerService).getArticleBySlug("bai-viet-2026");
    }

    @Test
    void numericIdIsLeftToCmsAndNeverReachesReaderService() throws Exception {
        mvc.perform(get("/api/v1/articles/123"))
                .andExpect(status().isOk())
                .andExpect(content().string("cms-draft-123"));

        verify(readerService, never()).getArticleBySlug(any());
    }

    /**
     * Đã chạy thử trên code hiện tại của CMS: ArticleDraftController.getDraft đang map "/{id}" không có regex,
     * nên Spring ném IllegalStateException "Ambiguous handler methods mapped" với mọi slug.
     * Chỉ bật lại test này sau khi SV5 đổi mapping thành "/{id:\\d+}" (đã báo Leader/Tùng).
     */
    @Test
    void realCmsControllerDoesNotClashWithReaderSlugRoute() throws Exception {
        ArticleDraftService draftService = mock(ArticleDraftService.class);
        MockMvc real = MockMvcBuilders
                .standaloneSetup(new ReaderArticleController(readerService), new ArticleDraftController(draftService))
                .build();
        when(readerService.getArticleBySlug("bai-viet-2026")).thenReturn(ArticleReaderResponse.builder().build());

        real.perform(get("/api/v1/articles/bai-viet-2026")).andExpect(status().isOk());
        real.perform(get("/api/v1/articles/123")).andExpect(status().isOk());

        verify(readerService).getArticleBySlug("bai-viet-2026");
        verify(draftService).getDraft(123L);
    }

    @Test
    void isPremiumFlagIsConvertedToAccessAndSizeIsCapped() throws Exception {
        Page<ArticleSummaryResponse> empty = new PageImpl<>(List.of(), PageRequest.of(0, 50), 0);
        when(readerService.getArticles(isNull(), isNull(), eq("PREMIUM"), any(Pageable.class))).thenReturn(empty);

        mvc.perform(get("/api/v1/articles").param("isPremium", "true").param("size", "9999").param("page", "-5"))
                .andExpect(status().isOk());

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(readerService).getArticles(isNull(), isNull(), eq("PREMIUM"), pageable.capture());
        assertEquals(50, pageable.getValue().getPageSize());
        assertEquals(0, pageable.getValue().getPageNumber());
    }

    @Test
    void clientSortParameterIsIgnored() throws Exception {
        when(readerService.getArticles(any(), any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 20), 0));

        mvc.perform(get("/api/v1/articles").param("sort", "view_count;DROP TABLE articles,desc"))
                .andExpect(status().isOk());

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(readerService).getArticles(any(), any(), any(), pageable.capture());
        assertTrue(pageable.getValue().getSort().isUnsorted());
    }
}
