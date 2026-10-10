package com.localpress.editorial;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.editorial.controller.EditorialModerationController;
import com.localpress.editorial.dto.*;
import com.localpress.editorial.service.ContentPolicyModerationService;
import com.localpress.shared.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(EditorialModerationController.class)
@Import(SecurityConfig.class)
class EditorialModerationControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ContentPolicyModerationService moderationService;

    @MockBean
    private JdbcTemplate jdbcTemplate;

    @Test
    @WithMockUser(roles = "EDITOR")
    void getComments_returnsList() throws Exception {
        EditorialCommentDto commentDto = EditorialCommentDto.builder()
                .id("1")
                .articleId("1")
                .articleTitle("Bài viết Hải Phòng")
                .userName("Độc giả An")
                .content("Bình luận rất hay!")
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();

        when(moderationService.getComments(anyString())).thenReturn(List.of(commentDto));

        mvc.perform(get("/api/v1/editorial/comments?status=PENDING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value("Bình luận rất hay!"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void moderateComment_approvesSuccessfully() throws Exception {
        EditorialCommentDto commentDto = EditorialCommentDto.builder()
                .id("1")
                .status("APPROVED")
                .build();

        when(moderationService.moderateComment(eq(1L), any(ModerateCommentRequest.class))).thenReturn(commentDto);

        ModerateCommentRequest req = new ModerateCommentRequest("APPROVED", "Hợp lệ");

        mvc.perform(post("/api/v1/editorial/comments/1/moderate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void updateArticlePolicy_returnsUpdatedArticle() throws Exception {
        EditorialArticleDto articleDto = EditorialArticleDto.builder()
                .id("1")
                .slug("bai-viet-hay")
                .isPremium(true)
                .price(new BigDecimal("15000.00"))
                .status("PUBLISHED")
                .build();

        when(moderationService.updateArticlePolicy(eq(1L), any(UpdateArticlePolicyRequest.class)))
                .thenReturn(articleDto);

        UpdateArticlePolicyRequest req = new UpdateArticlePolicyRequest("PREMIUM", new BigDecimal("15000.00"));

        mvc.perform(put("/api/v1/editorial/articles/1/policy")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPremium").value(true))
                .andExpect(jsonPath("$.price").value(15000.00));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void getSubscriptionPlans_returnsList() throws Exception {
        SubscriptionPlanDto planDto = SubscriptionPlanDto.builder()
                .id("1")
                .name("Gói Tháng VIP")
                .code("PLAN_1")
                .price(new BigDecimal("50000.00"))
                .durationDays(30)
                .isActive(true)
                .status("ACTIVE")
                .build();

        when(moderationService.getAllPlans()).thenReturn(List.of(planDto));

        mvc.perform(get("/api/v1/editorial/subscription-plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Gói Tháng VIP"))
                .andExpect(jsonPath("$[0].price").value(50000.00));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void createSubscriptionPlan_createsSuccessfully() throws Exception {
        SubscriptionPlanDto planDto = SubscriptionPlanDto.builder()
                .id("2")
                .name("Gói Năm VIP")
                .code("PLAN_2")
                .price(new BigDecimal("480000.00"))
                .durationDays(365)
                .isActive(true)
                .status("ACTIVE")
                .build();

        when(moderationService.createPlan(any(SaveSubscriptionPlanRequest.class))).thenReturn(planDto);

        SaveSubscriptionPlanRequest req = SaveSubscriptionPlanRequest.builder()
                .name("Gói Năm VIP")
                .price(new BigDecimal("480000.00"))
                .durationDays(365)
                .hasAdFree(true)
                .hasAudio(true)
                .status("ACTIVE")
                .build();

        mvc.perform(post("/api/v1/editorial/subscription-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Gói Năm VIP"))
                .andExpect(jsonPath("$.durationDays").value(365));
    }

    @Test
    @WithMockUser(roles = "EDITOR")
    void toggleSubscriptionPlanStatus_togglesSuccessfully() throws Exception {
        SubscriptionPlanDto planDto = SubscriptionPlanDto.builder()
                .id("1")
                .name("Gói Tháng")
                .isActive(false)
                .status("INACTIVE")
                .build();

        when(moderationService.togglePlanStatus(eq(1L))).thenReturn(planDto);

        mvc.perform(post("/api/v1/editorial/subscription-plans/1/toggle-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(false))
                .andExpect(jsonPath("$.status").value("INACTIVE"));
    }
}
