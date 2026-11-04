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

@EnabledIfSystemProperty(named="localpress.url.it",matches="true")
@AutoConfigureMockMvc
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT, properties={
 "spring.datasource.url=jdbc:mysql://localhost:3306/localpress_sv5_url_it_20261103?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=Asia/Ho_Chi_Minh&allowPublicKeyRetrieval=true",
 "localpress.sepay.merchant-id=IT", "localpress.sepay.secret-key=it-test-key"
})
class AdUrlMonitorDatabaseTest {
    @TempDir static Path images;
    @DynamicPropertySource static void imageStorage(DynamicPropertyRegistry registry) {
        registry.add("localpress.storage.creative-directory",()->images.toString());
    }
    @org.springframework.boot.test.web.server.LocalServerPort int serverPort;
    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired AdServingService delivery;
    @Autowired AdministrationService admin;
    @Autowired com.localpress.administration.service.AdUrlScanLease lease;
    @Autowired com.localpress.administration.service.AdUrlMonitorService monitor;
    @org.springframework.boot.test.mock.mockito.MockBean com.localpress.administration.service.AdUrlProbe probe;
    long actor, advUser, advertiser, slot, campaign, creative;
    String code, imagePath;
    TestingAuthenticationToken auth;
    final LocalDate today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    @BeforeEach void fixtures() throws Exception {
        assertEquals("localpress_sv5_url_it_20261103",jdbc.queryForObject("SELECT DATABASE()",String.class));
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
        if(creative>0)jdbc.update("DELETE FROM audit_logs WHERE target_type='AD_CREATIVE' AND target_id=?",creative);
        if(actor>0)jdbc.update("DELETE FROM audit_logs WHERE user_id=?",actor);
        if(campaign>0){jdbc.update("DELETE FROM ad_stats WHERE campaign_id=?",campaign);jdbc.update("DELETE FROM ad_creatives WHERE campaign_id=?",campaign);jdbc.update("DELETE FROM ad_campaigns WHERE campaign_id=?",campaign);}
        if(slot>0)jdbc.update("DELETE FROM ad_slots WHERE slot_id=?",slot);
        if(advertiser>0)jdbc.update("DELETE FROM advertisers WHERE advertiser_id=?",advertiser);
        if(actor>0)jdbc.update("DELETE FROM users WHERE user_id=?",actor);
        if(advUser>0)jdbc.update("DELETE FROM users WHERE user_id=?",advUser);
        if(code!=null)Files.deleteIfExists(images.resolve(code+".png"));
    }

    void probeResult(String outcome,String url) {
        org.mockito.Mockito.when(probe.check(org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.nullable(String.class)))
            .thenReturn(new com.localpress.administration.service.AdUrlProbe.Result(outcome,url,"Test result"));
    }
    @Test void scanResultIsDistinctFromSuccessfulAdminBlock() {
        probeResult("ERROR",null);var failed=monitor.scan(auth,creative,"127.0.0.1");
        assertEquals("FAILURE",jdbc.queryForObject("SELECT result FROM audit_logs WHERE user_id=? ORDER BY audit_id DESC LIMIT 1",String.class,actor));
        monitor.resolve(auth,creative,failed.checkId(),"BLOCK","Block unsafe URL","127.0.0.1");
        assertEquals("SUCCESS",jdbc.queryForObject("SELECT result FROM audit_logs WHERE user_id=? ORDER BY audit_id DESC LIMIT 1",String.class,actor));
        probeResult("CHANGED","https://example.test/changed");monitor.scan(auth,creative,"127.0.0.1");
        assertEquals("SUCCESS",jdbc.queryForObject("SELECT result FROM audit_logs WHERE user_id=? ORDER BY audit_id DESC LIMIT 1",String.class,actor));
        probeResult("BLOCKED",null);monitor.scan(auth,creative,"127.0.0.1");
        assertEquals("FAILURE",jdbc.queryForObject("SELECT result FROM audit_logs WHERE user_id=? ORDER BY audit_id DESC LIMIT 1",String.class,actor));
    }
    @Test void changedUrlStopsServingUntilAdminAcceptsAndAudits() {
        probeResult("CHANGED","https://other.example/landing");
        var changed=monitor.scan(auth,creative,"127.0.0.1");
        assertEquals("CHANGED",changed.scanStatus());assertNull(delivery.serve(code,null).creative());
        assertEquals(1,monitor.history(auth,creative).size());
        var accepted=monitor.resolve(auth,creative,changed.checkId(),"ACCEPT","Reviewed destination","127.0.0.1");
        assertEquals("SAFE",accepted.scanStatus());assertEquals("https://other.example/landing",accepted.baselineUrl());
        assertNotNull(delivery.serve(code,null).creative());
        assertEquals(2,jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE user_id=?",Integer.class,actor));
    }
    @Test void scanSuccessDoesNotAutomaticallyReleaseAnExistingAlert() {
        probeResult("ERROR",null);monitor.scan(auth,creative,"127.0.0.1");
        probeResult("OK","https://example.test/landing");var clean=monitor.scan(auth,creative,"127.0.0.1");
        assertEquals("SUSPICIOUS",clean.scanStatus());assertNull(delivery.serve(code,null).creative());
        monitor.resolve(auth,creative,clean.checkId(),"ACCEPT","Verified","127.0.0.1");
        assertNotNull(delivery.serve(code,null).creative());
    }
    @Test void errorCannotBeAcceptedAndBlockCannotBeUndoneByAScan() {
        probeResult("ERROR",null);var failed=monitor.scan(auth,creative,"127.0.0.1");
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->monitor.resolve(auth,creative,failed.checkId(),"ACCEPT","Review","127.0.0.1"));
        monitor.resolve(auth,creative,failed.checkId(),"BLOCK","Unavailable","127.0.0.1");
        probeResult("OK","https://example.test/landing");var next=monitor.scan(auth,creative,"127.0.0.1");
        assertEquals("BLOCKED",next.reviewStatus());assertNull(delivery.serve(code,null).creative());
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->monitor.resolve(auth,creative,next.checkId(),"ACCEPT","Review","127.0.0.1"));
    }
    @Test void staleOrExpiredChecksCannotBeAccepted() {
        probeResult("OK","https://example.test/landing");var first=monitor.scan(auth,creative,"127.0.0.1");
        var second=monitor.scan(auth,creative,"127.0.0.1");
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->monitor.resolve(auth,creative,first.checkId(),"ACCEPT","Review","127.0.0.1"));
        jdbc.update("UPDATE ad_url_checks SET checked_at=DATE_SUB(NOW(),INTERVAL 11 MINUTE) WHERE check_id=?",second.checkId());
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->monitor.resolve(auth,creative,second.checkId(),"ACCEPT","Review","127.0.0.1"));
    }
    @Test void modifiedTargetDuringScanIsNotOverwritten() {
        org.mockito.Mockito.when(probe.check(org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.nullable(String.class))).thenAnswer(invocation->{
            jdbc.update("UPDATE ad_creatives SET target_url='https://changed.example/' WHERE creative_id=?",creative);
            return new com.localpress.administration.service.AdUrlProbe.Result("OK","https://example.test/landing","Test");
        });
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->monitor.scan(auth,creative,"127.0.0.1"));
        assertEquals(0,monitor.history(auth,creative).size());
    }
    @Test void nonAdminCannotReadOrScanOrResolve() {
        jdbc.update("UPDATE users SET role='AUTHOR' WHERE user_id=?",actor);
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->monitor.list(auth));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->monitor.scan(auth,creative,"127.0.0.1"));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,()->monitor.resolve(auth,creative,1,"BLOCK","Review","127.0.0.1"));
        org.mockito.Mockito.verifyNoInteractions(probe);
    }
    @Test void anonymousEndpointIsDenied() throws Exception {
        mvc.perform(get("/api/v1/admin/ad-url-monitor")).andExpect(status().isUnauthorized());
    }
    @Test void adminHttpCanScanAndResolveButAuthorCannot() throws Exception {
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/admin/ad-url-monitor/"+creative+"/resolve")
            .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication(auth))
            .contentType("application/json").content("{}"))
            .andExpect(status().isBadRequest());
        probeResult("CHANGED","https://other.example/landing");
        mvc.perform(get("/api/v1/admin/ad-url-monitor").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication(auth)))
            .andExpect(status().isOk());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/admin/ad-url-monitor/"+creative+"/scan")
            .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication(auth)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.scanStatus").value("CHANGED"));
        var check=monitor.history(auth,creative).get(0).get("id");
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/admin/ad-url-monitor/"+creative+"/resolve")
            .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication(auth))
            .contentType("application/json").content("{\"checkId\":"+check+",\"action\":\"ACCEPT\",\"note\":\"Verified\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.scanStatus").value("SAFE"));
        var author=new TestingAuthenticationToken(auth.getName(),"unused","ROLE_AUTHOR");
        mvc.perform(get("/api/v1/admin/ad-url-monitor").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication(author)))
            .andExpect(status().isForbidden());
    }

    com.localpress.administration.service.AdUrlScanJob job(boolean enabled) {
        return new com.localpress.administration.service.AdUrlScanJob(
            new com.localpress.administration.service.AdUrlScheduleSettings(enabled,300000,60000,6,10),lease,monitor);
    }
    @Test void scheduledScanIsAuditedAsSystemAndDoesNotRepeatFreshResults() {
        probeResult("CHANGED","https://other.example/landing");
        job(true).tick();job(true).tick();
        var history=monitor.history(auth,creative);
        assertEquals(1,history.size());assertEquals("AUTO",history.get(0).get("source"));
        assertNull(delivery.serve(code,null).creative());
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE action='AD_URL_AUTO_SCAN' AND user_id IS NULL AND target_id=?",Integer.class,creative));
        org.mockito.Mockito.verify(probe,org.mockito.Mockito.times(1)).check(org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.nullable(String.class));
    }
    @Test void disabledOrAlreadyLeasedJobDoesNotProbe() {
        job(false).tick();
        lease.run("batch",()->{job(true).tick();return true;});
        org.mockito.Mockito.verifyNoInteractions(probe);
    }
    @Test void manualAndAutomaticScansRespectTheSameCreativeLease() {
        lease.run("creative:"+creative,()->{
            assertEquals(409,assertThrows(org.springframework.web.server.ResponseStatusException.class,()->monitor.scan(auth,creative,"127.0.0.1")).getStatusCode().value());
            job(true).tick();return true;
        });
        org.mockito.Mockito.verifyNoInteractions(probe);
        probeResult("OK","https://example.test/landing");job(true).tick();
        assertEquals(1,monitor.history(auth,creative).size());
    }
    @Test void automaticCleanRecheckDoesNotClearExistingAlert() {
        probeResult("ERROR",null);job(true).tick();
        jdbc.update("UPDATE ad_creatives SET last_scanned_at=DATE_SUB(NOW(),INTERVAL 7 HOUR) WHERE creative_id=?",creative);
        probeResult("OK","https://example.test/landing");job(true).tick();
        assertEquals("SUSPICIOUS",jdbc.queryForObject("SELECT scan_status FROM ad_creatives WHERE creative_id=?",String.class,creative));
        assertEquals(2,monitor.history(auth,creative).size());
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"EXPIRED","UNPAID","INACTIVE_SLOT","BLOCKED"})
    void schedulerSkipsIneligibleCampaigns(String reason) {
        switch(reason) {
            case "EXPIRED" -> jdbc.update("UPDATE ad_campaigns SET start_date=?,end_date=? WHERE campaign_id=?",today.minusDays(2),today.minusDays(1),campaign);
            case "UNPAID" -> jdbc.update("UPDATE ad_campaigns SET payment_status='UNPAID' WHERE campaign_id=?",campaign);
            case "INACTIVE_SLOT" -> jdbc.update("UPDATE ad_slots SET status='INACTIVE' WHERE slot_id=?",slot);
            case "BLOCKED" -> jdbc.update("UPDATE ad_creatives SET review_status='BLOCKED' WHERE creative_id=?",creative);
        }
        job(true).tick();org.mockito.Mockito.verifyNoInteractions(probe);
    }

}
