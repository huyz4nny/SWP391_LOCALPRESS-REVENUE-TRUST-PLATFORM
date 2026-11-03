package com.localpress.advertising;

import com.localpress.shared.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdPortalController.class)
@Import(SecurityConfig.class)
class AdPortalControllerTest {
    @Autowired MockMvc mvc;
    @MockBean AdDashboardService dashboard;
    @MockBean AdCancellationService cancellations;
    @MockBean AdNotificationService notifications;
    @MockBean org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Test void anonymousCannotReadDashboard() throws Exception {
        mvc.perform(get("/api/v1/advertiser/dashboard")).andExpect(status().isUnauthorized());
        verifyNoInteractions(dashboard);
    }
    @Test @WithMockUser(roles="READER") void readerCannotCancel() throws Exception {
        mvc.perform(post("/api/v1/advertiser/campaigns/1/cancel").contentType(MediaType.APPLICATION_JSON)
            .content("{\"reason\":\"Cancel\",\"acknowledged\":true}")).andExpect(status().isForbidden());
        verifyNoInteractions(cancellations);
    }
    @Test @WithMockUser(username="owner@test.local",roles="ADVERTISER") void cancellationNeedsReasonAndAcknowledgement() throws Exception {
        for(String body:new String[]{"{\"reason\":\"\",\"acknowledged\":true}","{\"reason\":\"Cancel\",\"acknowledged\":false}"}) {
            mvc.perform(post("/api/v1/advertiser/campaigns/1/cancel").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isString());
        }
        verifyNoInteractions(cancellations);
    }
    @Test @WithMockUser(username="owner@test.local",roles="ADVERTISER") void serviceErrorsKeepTheirStatusAndMessage() throws Exception {
        when(cancellations.quote("owner@test.local",7)).thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));
        mvc.perform(get("/api/v1/advertiser/campaigns/7/cancellation-quote"))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.message").value("Không tìm thấy booking"));
    }
}
