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
    @Configuration @EnableWebMvc @Import({com.localpress.administration.controller.AdSlotConfigController.class,SecurityConfig.class,AdministrationController.class,AdServingController.class,com.localpress.content.controller.ArticleImageController.class,com.localpress.content.controller.EditorialAiController.class})
    static class Config {
        @Bean com.localpress.administration.service.AdSlotConfigService slotConfigService(){return mock(com.localpress.administration.service.AdSlotConfigService.class);}
        @Bean com.localpress.content.service.ArticleMediaService articleMediaService(){return mock(com.localpress.content.service.ArticleMediaService.class);}
        @Bean com.localpress.content.service.EditorialAiService editorialAiService(){return mock(com.localpress.content.service.EditorialAiService.class);}
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
    @Test void publishedImageRouteAllowsGuestsAndDoesNotCache() throws Exception {
        var media = context.getBean(com.localpress.content.service.ArticleMediaService.class);
        when(media.getCoverImage("published.png")).thenReturn(new org.springframework.core.io.ByteArrayResource(new byte[]{1}));
        mvc.perform(get("/api/v1/content/images/published.png")).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(post("/api/v1/content/images/published.png")).andExpect(status().isUnauthorized());
    }
    @Test void aiRolesAndInputAreValidatedBeforeProviderCall() throws Exception {
        String url = "/api/v1/editorial/ai/suggest";
        mvc.perform(post(url).contentType("application/json").content("{\"topic\":\"Topic\"}"))
                .andExpect(status().isUnauthorized());
        for (String role : List.of("STAFF", "READER", "ADVERTISER")) {
            mvc.perform(post(url).with(user("test").roles(role)).contentType("application/json").content("{\"topic\":\"Topic\"}"))
                    .andExpect(status().isForbidden());
        }
        mvc.perform(post(url).with(user("test").roles("AUTHOR")).contentType("application/json").content("{\"topic\":\" \"}"))
                .andExpect(status().isBadRequest());
        var ai = context.getBean(com.localpress.content.service.EditorialAiService.class);
        verifyNoInteractions(ai);
        for (String role : List.of("AUTHOR", "EDITOR", "SYSTEM_ADMIN")) {
            mvc.perform(post(url).with(user("test").roles(role)).contentType("application/json").content("{\"topic\":\" Topic \"}"))
                    .andExpect(status().isOk());
        }
        verify(ai, times(3)).suggest("Topic");
    }
    @Test void guestsCanRequestBannerAndReportAnIssuedToken() throws Exception {
        when(delivery.serve("TOP",null,"127.0.0.1")).thenReturn(new AdServingService.Offer(new Slot("1","TOP","Top","970x90",1),null,null));
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

    @Test void slotConfigurationIsAdminOnlyAndValidatesInput() throws Exception {
        var slots = context.getBean(com.localpress.administration.service.AdSlotConfigService.class);
        String url = "/api/v1/admin/ad-slots";
        String valid = "{\"name\":\"Top\",\"basePrice\":100,\"capacity\":1,\"status\":\"ACTIVE\",\"expectedRevision\":\"" + "a".repeat(64) + "\"}";
        mvc.perform(get(url)).andExpect(status().isUnauthorized());
        mvc.perform(put(url + "/1").contentType("application/json").content(valid)).andExpect(status().isUnauthorized());
        for (String role : List.of("AUTHOR","EDITOR","STAFF","ACCOUNTANT","ADVERTISER","READER")) {
            mvc.perform(get(url).with(user("test").roles(role))).andExpect(status().isForbidden());
            mvc.perform(put(url + "/1").with(user("test").roles(role)).contentType("application/json").content(valid)).andExpect(status().isForbidden());
        }
        for (String invalid : List.of(valid.replace("100", "-1"), valid.replace("100", "1.001"),
                valid.replace("Top", " "), valid.replace("Top", "x".repeat(151)), valid.replace("ACTIVE", "UNKNOWN"),
                valid.replace("\"capacity\":1", "\"capacity\":0"), valid.replace("a".repeat(64), "old"))) {
            mvc.perform(put(url + "/1").with(user("admin").roles("SYSTEM_ADMIN")).contentType("application/json").content(invalid)).andExpect(status().isBadRequest());
        }
        verifyNoInteractions(slots);
        when(slots.list(any())).thenReturn(List.of());
        mvc.perform(get(url).with(user("admin").roles("SYSTEM_ADMIN"))).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"));
        mvc.perform(put(url + "/1").with(user("admin").roles("SYSTEM_ADMIN")).contentType("application/json").content(valid)).andExpect(status().isOk());
        verify(slots).update(any(),eq(1L),any(),anyString());
    }
}
