package com.localpress.administration;

import com.localpress.administration.controller.AdministrationController;
import com.localpress.administration.service.AdministrationService;
import com.localpress.delivery.controller.AdServingController;
import com.localpress.delivery.repository.AdServingRepository.Slot;
import com.localpress.delivery.service.AdServingService;
import com.localpress.shared.security.SecurityConfig;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.*;
import org.springframework.core.env.MapPropertySource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockServletContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class Sv5EndpointSecurityTest {
    @Configuration @EnableWebMvc @Import({SecurityConfig.class,AdministrationController.class,AdServingController.class})
    static class Config {
        @Bean JdbcTemplate jdbcTemplate(){return mock(JdbcTemplate.class);}
        @Bean AdministrationService administrationService(){return mock(AdministrationService.class);}
        @Bean AdServingService adServingService(){return mock(AdServingService.class);}
    }
    AnnotationConfigWebApplicationContext context;
    MockMvc mvc;
    AdministrationService admin;
    AdServingService delivery;
    @BeforeEach void setup() {
        context=new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("test",Map.of("localpress.jwt.secret","test-only-secret-at-least-32-bytes-long")));
        context.register(Config.class);context.refresh();
        mvc=MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        admin=context.getBean(AdministrationService.class);delivery=context.getBean(AdServingService.class);
    }
    @AfterEach void cleanup(){context.close();}
    @Test void guestsCanRequestBannerAndReportAnIssuedToken() throws Exception {
        when(delivery.serve("TOP",null)).thenReturn(new AdServingService.Offer(new Slot("1","TOP","Top","970x90",1),null,null));
        mvc.perform(get("/api/v1/delivery/ad-slots/TOP/serve")).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"));
        mvc.perform(post("/api/v1/delivery/impressions").contentType("application/json").content("{\"token\":\"issued-ticket\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.recorded").value(false));
    }
    @Test void administrationIsDeniedToGuestsAndReaders() throws Exception {
        mvc.perform(get("/api/v1/admin/users")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/users").with(user("reader").roles("READER"))).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/admin/paywall-settings").with(user("author").roles("AUTHOR"))
                .contentType("application/json").content("{}" )).andExpect(status().isForbidden());
        verifyNoInteractions(admin);
    }
    @Test void systemAdministratorCanLoadRealEndpoint() throws Exception {
        when(admin.users(any())).thenReturn(List.of());
        mvc.perform(get("/api/v1/admin/users").with(user("admin").roles("SYSTEM_ADMIN")))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
        verify(admin).users(any());
    }
    @Test void disablingPaywallIsRejectedBeforePersistence() throws Exception {
        mvc.perform(put("/api/v1/admin/paywall-settings").with(user("admin").roles("SYSTEM_ADMIN"))
                .contentType("application/json").content("{\"previewWordLimit\":120,\"maxDevicesAllowed\":2,\"paywallEnabled\":false,\"pricePerArticleDefault\":15000,\"watermarkEnabled\":false}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(admin);
    }
}
