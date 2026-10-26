package com.localpress.content.controller;

import com.localpress.content.dto.ArticleVersionDetailResponse;
import com.localpress.content.service.ArticleVersionService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ArticleVersionSubmissionControllerTest {
    @Test void submitAcceptsNoBodyAndReturnsPendingVersionWithoutCaching() throws Exception {
        ArticleVersionService service = mock(ArticleVersionService.class);
        var response = new ArticleVersionDetailResponse(
                1L, 5, "Draft", "Sapo", "Content", null, Map.of(),
                "PENDING", null, 4L, null, true, false);
        when(service.submitVersionForReview(1L, 5)).thenReturn(response);
        var mvc = MockMvcBuilders.standaloneSetup(new ArticleVersionController(service)).build();

        mvc.perform(post("/api/v1/articles/1/versions/5/submit"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.reviewStatus").value("PENDING"))
                .andExpect(jsonPath("$.versionNumber").value(5))
                .andExpect(jsonPath("$.published").value(false));
        verify(service).submitVersionForReview(1L, 5);
    }
}
