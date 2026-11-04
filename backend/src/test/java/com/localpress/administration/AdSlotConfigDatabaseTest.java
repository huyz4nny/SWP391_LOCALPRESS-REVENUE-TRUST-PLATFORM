package com.localpress.administration;

import com.localpress.administration.service.AdSlotConfigService;
import com.localpress.administration.repository.AdSlotConfigRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Opt-in: uses a dedicated local schema, never the application's development database. */
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
@EnabledIfSystemProperty(named="localpress.slot.it", matches="true")
@SpringBootTest(properties={
    "spring.datasource.url=jdbc:mysql://localhost:3306/localpress_sv5_slot_it_20261103?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=Asia/Ho_Chi_Minh&allowPublicKeyRetrieval=true",
    "localpress.sepay.merchant-id=IT", "localpress.sepay.secret-key=it-test-key"
})
class AdSlotConfigDatabaseTest {
    @Autowired org.springframework.test.web.servlet.MockMvc mvc;
    @Autowired com.fasterxml.jackson.databind.ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired AdSlotConfigService service;
    @Autowired PlatformTransactionManager transactionManager;
    @SpyBean AdSlotConfigRepository repository;
    long actor, advertiserUser, advertiser, slot;
    TestingAuthenticationToken auth;
    final LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    @BeforeEach void fixtures() {
        assertEquals("localpress_sv5_slot_it_20261103",jdbc.queryForObject("SELECT DATABASE()",String.class));
        String key=UUID.randomUUID().toString();
        String email="slot-admin-"+key+"@test.local";
        jdbc.update("INSERT INTO users(email,password_hash,full_name,role) VALUES (?,'x','Slot IT','SYSTEM_ADMIN')",email);
        actor=jdbc.queryForObject("SELECT user_id FROM users WHERE email=?",Long.class,email);
        auth=new TestingAuthenticationToken(email,"unused","ROLE_SYSTEM_ADMIN");
        String adv="slot-adv-"+key+"@test.local";
        jdbc.update("INSERT INTO users(email,password_hash,full_name,role) VALUES (?,'x','Slot IT','ADVERTISER')",adv);
        advertiserUser=jdbc.queryForObject("SELECT user_id FROM users WHERE email=?",Long.class,adv);
        jdbc.update("INSERT INTO advertisers(user_id,company_name,tax_code,contact_person,email,phone) VALUES (?,'IT',?,'IT',?,'0900000000')",advertiserUser,key,adv);
        advertiser=jdbc.queryForObject("SELECT advertiser_id FROM advertisers WHERE user_id=?",Long.class,advertiserUser);
        jdbc.update("INSERT INTO ad_slots(slot_code,name,page_location,dimensions,capacity,inventory_mode,base_price,pricing_type) VALUES (?,'IT',?,'728x90',3,'ROTATING',100,'CPD')",key,key);
        slot=jdbc.queryForObject("SELECT slot_id FROM ad_slots WHERE slot_code=?",Long.class,key);
    }
    @AfterEach void cleanup() {
        reset(repository);
        if (actor>0) jdbc.update("DELETE FROM audit_logs WHERE user_id=?",actor);
        if (slot>0) { jdbc.update("DELETE FROM ad_campaigns WHERE slot_id=?",slot); jdbc.update("DELETE FROM ad_slots WHERE slot_id=?",slot); }
        if (advertiser>0) jdbc.update("DELETE FROM advertisers WHERE advertiser_id=?",advertiser);
        if (actor>0) jdbc.update("DELETE FROM users WHERE user_id=?",actor);
        if (advertiserUser>0) jdbc.update("DELETE FROM users WHERE user_id=?",advertiserUser);
    }
    AdSlotConfigService.Input input(int capacity,String status) {
        var view=service.list(auth).stream().filter(s->s.id().equals(Long.toString(slot))).findFirst().orElseThrow();
        return new AdSlotConfigService.Input("Updated",new BigDecimal("150.00"),capacity,status,view.revision());
    }
    void booking(String status,String payment,String hold,String issue,LocalDate start,LocalDate end) {
        jdbc.update("INSERT INTO ad_campaigns(advertiser_id,slot_id,campaign_name,start_date,end_date,status,payment_status,hold_expires_at,payment_issue) VALUES (?,?,'IT',?,?,?,?,"+hold+",?)",
            advertiser,slot,start,end,status,payment,issue);
    }
    @Test void sqlFiltersExpiredRejectedAndConflictedHoldsButKeepsPaid() {
        booking("PENDING","UNPAID","DATE_SUB(NOW(), INTERVAL 1 HOUR)",null,today,today.plusDays(2));
        booking("REJECTED","UNPAID","NULL",null,today,today.plusDays(2));
        booking("PENDING","UNPAID","NULL","LATE_PAYMENT_CONFLICT",today,today.plusDays(2));
        service.update(auth,slot,input(1,"ACTIVE"),"127.0.0.1");
        booking("ACTIVE","PAID","DATE_SUB(NOW(), INTERVAL 1 HOUR)",null,today,today.plusDays(2));
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.update(auth,slot,input(1,"INACTIVE"),"127.0.0.1")).getStatusCode().value());
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE user_id=?",Integer.class,actor));
    }
    @Test void failedAuditRollsBackSlotUpdate() {
        var request=input(2,"ACTIVE");
        doThrow(new org.springframework.dao.DataAccessResourceFailureException("Audit unavailable")).when(repository).audit(anyLong(),anyLong(),anyString(),anyString(),anyString());
        assertThrows(org.springframework.dao.DataAccessResourceFailureException.class,()->service.update(auth,slot,request,"127.0.0.1"));
        assertEquals(3,jdbc.queryForObject("SELECT capacity FROM ad_slots WHERE slot_id=?",Integer.class,slot));
        assertEquals(new BigDecimal("100.00"),jdbc.queryForObject("SELECT base_price FROM ad_slots WHERE slot_id=?",BigDecimal.class,slot));
    }
    @Test void configWaitsForBookingLockThenSeesCommittedCalendar() throws Exception {
        var request=input(1,"ACTIVE");
        var held=new CountDownLatch(1); var release=new CountDownLatch(1);
        ExecutorService pool=Executors.newFixedThreadPool(2);
        try {
            Future<?> writer=pool.submit(()->new TransactionTemplate(transactionManager).executeWithoutResult(tx->{
                jdbc.queryForObject("SELECT slot_id FROM ad_slots WHERE slot_id=? FOR UPDATE",Long.class,slot);
                booking("PENDING","UNPAID","NULL",null,today,today.plusDays(2));
                booking("PENDING","UNPAID","NULL",null,today.plusDays(2),today.plusDays(4));
                held.countDown();
                try { if(!release.await(10,TimeUnit.SECONDS)) throw new IllegalStateException("Test timeout"); }
                catch(InterruptedException e){Thread.currentThread().interrupt();throw new IllegalStateException(e);}
            }));
            assertTrue(held.await(10,TimeUnit.SECONDS));
            Future<?> config=pool.submit(()->service.update(auth,slot,request,"127.0.0.1"));
            assertThrows(TimeoutException.class,()->config.get(300,TimeUnit.MILLISECONDS));
            release.countDown(); writer.get(10,TimeUnit.SECONDS);
            ExecutionException error=assertThrows(ExecutionException.class,()->config.get(10,TimeUnit.SECONDS));
            assertInstanceOf(ResponseStatusException.class,error.getCause());
            assertEquals(409,((ResponseStatusException)error.getCause()).getStatusCode().value());
            assertEquals(3,jdbc.queryForObject("SELECT capacity FROM ad_slots WHERE slot_id=?",Integer.class,slot));
        } finally { release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(10,TimeUnit.SECONDS)); }
    }

    org.springframework.test.web.servlet.ResultActions put(AdSlotConfigService.Input request) throws Exception {
        return mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
            .put("/api/v1/admin/ad-slots/"+slot)
            .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(auth.getName()).roles("SYSTEM_ADMIN"))
            .contentType("application/json").content(json.writeValueAsString(request)));
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(ints={0,10})
    void httpRejectsDeactivationForCurrentAndFuturePaidBooking(int days) throws Exception {
        booking("ACTIVE","PAID","NULL",null,today.plusDays(days),today.plusDays(days+2));
        put(input(3,"INACTIVE"))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isConflict())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Không thể tắt")));
        assertEquals("ACTIVE",jdbc.queryForObject("SELECT status FROM ad_slots WHERE slot_id=?",String.class,slot));
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE user_id=?",Integer.class,actor));
    }
    @Test void expiredActiveCampaignDoesNotBlockDisableAndReenable() throws Exception {
        booking("ACTIVE","PAID","NULL",null,today.minusDays(20),today.minusDays(1));
        put(input(3,"INACTIVE")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
        assertEquals("INACTIVE",jdbc.queryForObject("SELECT status FROM ad_slots WHERE slot_id=?",String.class,slot));
        put(input(3,"ACTIVE")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
        assertEquals("ACTIVE",jdbc.queryForObject("SELECT status FROM ad_slots WHERE slot_id=?",String.class,slot));
        assertEquals(2,jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE user_id=?",Integer.class,actor));
    }
    @Test void namePricePersistWithAuditAndStaleTabCannotOverwrite() throws Exception {
        var stale=input(3,"ACTIVE");
        put(stale).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
        var reloaded=service.list(auth).stream().filter(s->s.id().equals(Long.toString(slot))).findFirst().orElseThrow();
        assertEquals("Updated",reloaded.name());assertEquals(new BigDecimal("150.00"),reloaded.basePrice());
        assertNotEquals(stale.expectedRevision(),reloaded.revision());
        put(stale).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isConflict());
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE user_id=? AND action='UPDATE_AD_SLOT'",Integer.class,actor));
        assertEquals(0,new BigDecimal("100.00").compareTo(new BigDecimal(jdbc.queryForObject("SELECT JSON_UNQUOTE(JSON_EXTRACT(old_value,'$.basePrice')) FROM audit_logs WHERE user_id=?",String.class,actor))));
        assertEquals("Updated",jdbc.queryForObject("SELECT JSON_UNQUOTE(JSON_EXTRACT(new_value,'$.name')) FROM audit_logs WHERE user_id=?",String.class,actor));
    }
    @Test void httpRejectsCapacityBelowOverlappingBookings() throws Exception {
        booking("PENDING","UNPAID","NULL",null,today,today.plusDays(2));
        booking("PENDING","UNPAID","NULL",null,today.plusDays(2),today.plusDays(4));
        put(input(1,"ACTIVE")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isConflict());
        assertEquals(3,jdbc.queryForObject("SELECT capacity FROM ad_slots WHERE slot_id=?",Integer.class,slot));
        put(input(2,"ACTIVE")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());
        assertEquals(2,jdbc.queryForObject("SELECT capacity FROM ad_slots WHERE slot_id=?",Integer.class,slot));
    }
}
