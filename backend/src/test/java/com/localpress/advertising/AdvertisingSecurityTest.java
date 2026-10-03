package com.localpress.advertising;

import com.localpress.shared.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdvertisingController.class)
@Import(SecurityConfig.class)
class AdvertisingSecurityTest {
    @Autowired MockMvc mvc;
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
}
