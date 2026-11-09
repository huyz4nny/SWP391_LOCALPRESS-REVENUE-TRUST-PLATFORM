package com.localpress.identity.controller;

import com.localpress.shared.device.DeviceSessionContext;
import com.localpress.shared.device.DeviceSessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthLogoutControllerTest {

    DeviceSessionService devices = mock(DeviceSessionService.class);
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new AuthLogoutController(devices)).build();
    }

    @Test
    void logoutRevokesTheCurrentSid() throws Exception {
        mvc.perform(post("/api/v1/auth/logout")
                        .requestAttr(DeviceSessionContext.SESSION_ID, "sid-1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());

        verify(devices).revoke("sid-1");
    }

    @Test
    void logoutWithoutSidDoesNotRevoke() throws Exception {
        mvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isNoContent());

        verify(devices, never()).revoke(org.mockito.ArgumentMatchers.any());
    }
}
