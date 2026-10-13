package com.localpress.advertising;

import com.localpress.shared.security.SecurityConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.mockito.Mockito.verifyNoInteractions;

@WebMvcTest(AdvertisingController.class)
@Import(SecurityConfig.class)
class AdvertisingSecurityTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockBean JdbcTemplate jdbc;

    @Test
    void anonymousCannotReadProfile() throws Exception {
        mvc.perform(get("/api/v1/advertiser/profile")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "READER")
    void readerCannotReadProfile() throws Exception {
        mvc.perform(get("/api/v1/advertiser/profile")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADVERTISER")
    void invalidContactDetailsReturnFieldErrorsWithoutWritingToDatabase() throws Exception {
        var valid = new AdvertisingController.ProfileInput("Company A", "0201234567", "Tester",
                "test@example.com", "0901234567", "", "", "Logistics", "Company A",
                "0201234567", "Hai Phong", "billing@example.com");
        for (var field : Map.of("phone", "abcdefghij", "email", "invalid", "invoiceEmail", "invalid").entrySet()) {
            ObjectNode payload = json.valueToTree(valid);
            payload.put(field.getKey(), field.getValue());
            mvc.perform(put("/api/v1/advertiser/profile").contentType(MediaType.APPLICATION_JSON)
                            .content(json.writeValueAsString(payload)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fieldErrors." + field.getKey()).isString());
        }
        verifyNoInteractions(jdbc);
    }
}
