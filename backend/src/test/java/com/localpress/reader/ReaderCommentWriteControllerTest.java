package com.localpress.reader;

import com.localpress.reader.controller.ReaderCommentWriteController;
import com.localpress.reader.controller.ReaderPlanController;
import com.localpress.reader.controller.ReaderPurchaseExceptionHandler;
import com.localpress.reader.dto.PublicSubscriptionPlanResponse;
import com.localpress.reader.dto.ReaderCommentResponse;
import com.localpress.reader.dto.ReportCommentResponse;
import com.localpress.reader.repository.ReaderPlanRepository;
import com.localpress.reader.service.ReaderCommentWriteService;
import com.localpress.reader.service.ReaderCurrentUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ReaderCommentWriteControllerTest {

    private ReaderCommentWriteService commentService;
    private ReaderCurrentUser currentUser;
    private ReaderPlanRepository planRepository;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        commentService = mock(ReaderCommentWriteService.class);
        currentUser = mock(ReaderCurrentUser.class);
        planRepository = mock(ReaderPlanRepository.class);
        mvc = MockMvcBuilders
                .standaloneSetup(
                        new ReaderCommentWriteController(commentService, currentUser),
                        new ReaderPlanController(planRepository))
                .setControllerAdvice(new ReaderPurchaseExceptionHandler())
                .build();
    }

    @Test
    void postUsesUserFromSession() throws Exception {
        when(currentUser.requireUserId()).thenReturn(6L);
        when(commentService.post(6L, 3L, "Xin chào")).thenReturn(ReaderCommentResponse.builder()
                .id(20L).articleId(3L).userId(6L).content("Xin chào").status("PENDING").build());

        mvc.perform(post("/api/v1/reader/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"articleId\":3,\"content\":\"Xin chào\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.id").value(20));
    }

    @Test
    void editUsesUserFromSession() throws Exception {
        when(currentUser.requireUserId()).thenReturn(6L);
        when(commentService.edit(6L, 4L, "Đã sửa")).thenReturn(ReaderCommentResponse.builder()
                .id(4L).status("PENDING").content("Đã sửa").build());

        mvc.perform(put("/api/v1/reader/comments/4")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Đã sửa\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));
        verify(commentService).edit(6L, 4L, "Đã sửa");
    }

    @Test
    void reportReturnsPending() throws Exception {
        when(currentUser.requireUserId()).thenReturn(6L);
        when(commentService.report(6L, 10L, "Spam")).thenReturn(new ReportCommentResponse(10L, "PENDING"));

        mvc.perform(post("/api/v1/reader/comments/10/report")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Spam\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.commentId").value(10))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void guestPostReturns401() throws Exception {
        when(currentUser.requireUserId()).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập"));

        mvc.perform(post("/api/v1/reader/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"articleId\":3,\"content\":\"Xin chào\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Bạn cần đăng nhập"));
    }

    @Test
    void activePlansExposeScope() throws Exception {
        when(planRepository.findActive()).thenReturn(List.of(PublicSubscriptionPlanResponse.builder()
                .id(2L)
                .name("Gói Pháp luật")
                .price(new BigDecimal("99000.00"))
                .durationDays(30)
                .hasAdFree(false)
                .hasAudio(false)
                .status("ACTIVE")
                .accessScope("CATEGORY")
                .categoryId(3L)
                .categoryName("Pháp luật")
                .build()));

        mvc.perform(get("/api/v1/subscription-plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].accessScope").value("CATEGORY"))
                .andExpect(jsonPath("$[0].categoryName").value("Pháp luật"))
                .andExpect(jsonPath("$[0].id").value(2));
    }
}
