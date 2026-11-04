package com.localpress.delivery;

import com.localpress.delivery.service.AdServingService;
import com.localpress.administration.service.AdministrationService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@EnabledIfSystemProperty(named="localpress.delivery.it",matches="true")
@AutoConfigureMockMvc
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT, properties={
 "spring.datasource.url=jdbc:mysql://localhost:3306/localpress_sv5_delivery_it_20261103?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=Asia/Ho_Chi_Minh&allowPublicKeyRetrieval=true",
 "localpress.sepay.merchant-id=IT", "localpress.sepay.secret-key=it-test-key"
})
class AdDeliveryDatabaseTest {
    @TempDir static Path images;
    @DynamicPropertySource static void imageStorage(DynamicPropertyRegistry registry) {
        registry.add("localpress.storage.creative-directory",()->images.toString());
    }
    @org.springframework.boot.test.web.server.LocalServerPort int serverPort;
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired AdServingService delivery;
    @Autowired AdministrationService admin;
    long actor, advUser, advertiser, slot, campaign, creative;
    String code, imagePath;
    TestingAuthenticationToken auth;
    final LocalDate today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    @BeforeEach void fixtures() throws Exception {
        assertEquals("localpress_sv5_delivery_it_20261103",jdbc.queryForObject("SELECT DATABASE()",String.class));
        code=UUID.randomUUID().toString();String email="delivery-admin-"+code+"@test.local";
        jdbc.update("INSERT INTO users(email,password_hash,full_name,role) VALUES (?,'x','IT','SYSTEM_ADMIN')",email);
        actor=jdbc.queryForObject("SELECT user_id FROM users WHERE email=?",Long.class,email);
        auth=new TestingAuthenticationToken(email,"unused","ROLE_SYSTEM_ADMIN");
        String adv="delivery-adv-"+code+"@test.local";
        jdbc.update("INSERT INTO users(email,password_hash,full_name,role) VALUES (?,'x','IT','ADVERTISER')",adv);
        advUser=jdbc.queryForObject("SELECT user_id FROM users WHERE email=?",Long.class,adv);
        jdbc.update("INSERT INTO advertisers(user_id,company_name,tax_code,contact_person,email,phone) VALUES (?,'IT',?,'IT',?,'0900000000')",advUser,code,adv);
        advertiser=jdbc.queryForObject("SELECT advertiser_id FROM advertisers WHERE user_id=?",Long.class,advUser);
        jdbc.update("INSERT INTO ad_slots(slot_code,name,page_location,dimensions,capacity,inventory_mode,base_price,pricing_type) VALUES (?,'IT',?,'728x90',1,'EXCLUSIVE',100,'CPD')",code,code);
        slot=jdbc.queryForObject("SELECT slot_id FROM ad_slots WHERE slot_code=?",Long.class,code);
        jdbc.update("INSERT INTO ad_campaigns(advertiser_id,slot_id,campaign_name,start_date,end_date,status,payment_status,quotation_status,contract_reference) VALUES (?,?,'IT',?,?,'ACTIVE','PAID','ACCEPTED',?)",advertiser,slot,today,today.plusDays(2),code);
        campaign=jdbc.queryForObject("SELECT campaign_id FROM ad_campaigns WHERE slot_id=?",Long.class,slot);
        imagePath="/api/v1/ad-slots/creative-files/"+code+".png";
        Files.write(images.resolve(code+".png"),Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6C0sAAAAASUVORK5CYII="));
        jdbc.update("INSERT INTO ad_creatives(campaign_id,version_number,title,media_url,target_url,review_status,scan_status) VALUES (?,1,'IT',?,'https://example.test/landing','APPROVED','SAFE')",campaign,imagePath);
        creative=jdbc.queryForObject("SELECT creative_id FROM ad_creatives WHERE campaign_id=?",Long.class,campaign);
    }
    @AfterEach void cleanup() throws Exception {
        if(actor>0)jdbc.update("DELETE FROM audit_logs WHERE user_id=?",actor);
        if(campaign>0){jdbc.update("DELETE FROM ad_stats WHERE campaign_id=?",campaign);jdbc.update("DELETE FROM ad_creatives WHERE campaign_id=?",campaign);jdbc.update("DELETE FROM ad_campaigns WHERE campaign_id=?",campaign);}
        if(slot>0)jdbc.update("DELETE FROM ad_slots WHERE slot_id=?",slot);
        if(advertiser>0)jdbc.update("DELETE FROM advertisers WHERE advertiser_id=?",advertiser);
        if(actor>0)jdbc.update("DELETE FROM users WHERE user_id=?",actor);
        if(advUser>0)jdbc.update("DELETE FROM users WHERE user_id=?",advUser);
        if(code!=null)Files.deleteIfExists(images.resolve(code+".png"));
    }
    @Test void approvedInternalBannerIsOfferedAndItsImageCanBeLoadedByGuest() throws Exception {
        mvc.perform(get("/api/v1/delivery/ad-slots/"+code+"/serve"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.creative.imageUrl").value(imagePath))
            .andExpect(jsonPath("$.trackingToken").isNotEmpty()).andExpect(jsonPath("$.slot.status").value("ACTIVE"));
        mvc.perform(get(imagePath)).andExpect(status().isOk()).andExpect(content().contentType("image/png"))
            .andExpect(content().bytes(Files.readAllBytes(images.resolve(code+".png"))));
        var monitor=admin.delivery(auth).stream().filter(s->s.slotId().equals(Long.toString(slot))).findFirst().orElseThrow();
        assertEquals("SERVING",monitor.status());assertEquals(1,monitor.currentActiveCampaigns());
    }
    @Test void inactiveSlotIsHiddenAndMonitorRetainsHistoricalStats() {
        var offer=delivery.serve(code,null);assertTrue(delivery.track(offer.trackingToken(),false));
        jdbc.update("UPDATE ad_slots SET status='INACTIVE' WHERE slot_id=?",slot);
        var hidden=delivery.serve(code,null);assertTrue(hidden.hidden());assertNull(hidden.creative());assertNull(hidden.trackingToken());
        assertFalse(delivery.track(offer.trackingToken(),true));
        var monitor=admin.delivery(auth).stream().filter(s->s.slotId().equals(Long.toString(slot))).findFirst().orElseThrow();
        assertEquals("INACTIVE",monitor.status());assertEquals(0,monitor.currentActiveCampaigns());assertEquals(1,monitor.todayImpressions());
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"UNPAID","NO_CONTRACT","NO_QUOTE","EXPIRED","SUSPENDED","UNAPPROVED","SUSPICIOUS"})
    void internalImageDoesNotBypassEligibility(String reason) {
        switch(reason){
            case "UNPAID" -> jdbc.update("UPDATE ad_campaigns SET payment_status='UNPAID' WHERE campaign_id=?",campaign);
            case "NO_CONTRACT" -> jdbc.update("UPDATE ad_campaigns SET contract_reference=NULL WHERE campaign_id=?",campaign);
            case "NO_QUOTE" -> jdbc.update("UPDATE ad_campaigns SET quotation_status='PENDING' WHERE campaign_id=?",campaign);
            case "EXPIRED" -> jdbc.update("UPDATE ad_campaigns SET start_date=?,end_date=? WHERE campaign_id=?",today.minusDays(2),today.minusDays(1),campaign);
            case "SUSPENDED" -> jdbc.update("UPDATE ad_campaigns SET status='SUSPENDED' WHERE campaign_id=?",campaign);
            case "UNAPPROVED" -> jdbc.update("UPDATE ad_creatives SET review_status='PENDING' WHERE creative_id=?",creative);
            case "SUSPICIOUS" -> jdbc.update("UPDATE ad_creatives SET scan_status='SUSPICIOUS' WHERE creative_id=?",creative);
        }
        assertNull(delivery.serve(code,null).creative());
    }
    @Test void immediateClickPersistsExactlyOnceAndMissingStatsReturnFalse() {
        var token = delivery.serve(code, null).trackingToken();
        assertFalse(delivery.track(token, true));
        assertTrue(delivery.track(token, false));
        assertTrue(delivery.track(token, true));
        assertFalse(delivery.track(token, true));
        assertEquals(1L, jdbc.queryForObject("SELECT clicks FROM ad_stats WHERE creative_id=?", Long.class, creative));
        assertEquals(1L, jdbc.queryForObject("SELECT impressions FROM ad_stats WHERE creative_id=?", Long.class, creative));
        var next = delivery.serve(code, null).trackingToken();
        assertTrue(delivery.track(next, false));
        jdbc.update("DELETE FROM ad_stats WHERE creative_id=?", creative);
        assertFalse(delivery.track(next, true));
    }

    @Test
    @EnabledIfSystemProperty(named="localpress.delivery.browser.it", matches="true")
    void browserVisibilityAndClickPersistInMysql() throws Exception {
        String script = System.getProperty("localpress.delivery.browser.script");
        assertNotNull(script, "Browser test script path must be provided");
        var process = new ProcessBuilder("node", script);
        process.environment().put("DELIVERY_TEST_PORT", Integer.toString(serverPort));
        process.environment().put("DELIVERY_TEST_SLOT", code);
        process.environment().remove("SPRING_DATASOURCE_PASSWORD");
        process.environment().remove("SPRING_DATASOURCE_USERNAME");
        var output = java.nio.file.Path.of(script).resolveSibling("live-browser.log");
        process.redirectErrorStream(true).redirectOutput(output.toFile());
        var running = process.start();
        try {
            assertTrue(running.waitFor(60, java.util.concurrent.TimeUnit.SECONDS), "Browser test timed out");
            assertEquals(0, running.exitValue(), "Browser test failed; see live-browser.log");
            assertEquals(1L, jdbc.queryForObject("SELECT impressions FROM ad_stats WHERE creative_id=?", Long.class, creative));
            assertEquals(1L, jdbc.queryForObject("SELECT clicks FROM ad_stats WHERE creative_id=?", Long.class, creative));
        } finally {
            if (running.isAlive()) running.destroyForcibly();
        }
    }

}
