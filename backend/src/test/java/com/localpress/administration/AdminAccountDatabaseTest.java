package com.localpress.administration;
import com.localpress.administration.service.*;
import com.localpress.identity.service.JwtTokenService;
import com.localpress.identity.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
@EnabledIfSystemProperty(named="localpress.admin.it",matches="true")
@SpringBootTest(properties={"spring.datasource.url=jdbc:mysql://localhost:3306/localpress_sv5_admin_it_20261103?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=Asia/Ho_Chi_Minh&allowPublicKeyRetrieval=true","localpress.sepay.merchant-id=IT","localpress.sepay.secret-key=it-test-key"})
@AutoConfigureMockMvc
class AdminAccountDatabaseTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired AdminAccountService accounts;
    @Autowired AdministrationService admin;
    @Autowired JwtTokenService tokens;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder passwords;
    @Autowired MockMvc mvc;
    long actor,target;String actorEmail,email;
    TestingAuthenticationToken auth;
    @BeforeEach void fixture() {
        assertEquals("localpress_sv5_admin_it_20261103",jdbc.queryForObject("SELECT DATABASE()",String.class));
        String id=UUID.randomUUID().toString();actorEmail="admin-"+id+"@test.local";email="reader-"+id+"@test.local";
        jdbc.update("INSERT INTO users(email,password_hash,full_name,role) VALUES (?,?,'Admin test','SYSTEM_ADMIN')",actorEmail,passwords.encode("test-pass"));
        actor=jdbc.queryForObject("SELECT user_id FROM users WHERE email=?",Long.class,actorEmail);
        jdbc.update("INSERT INTO users(email,password_hash,full_name,role) VALUES (?,?,'Reader test','READER')",email,passwords.encode("test-pass"));
        target=jdbc.queryForObject("SELECT user_id FROM users WHERE email=?",Long.class,email);
        jdbc.update("INSERT INTO user_devices(user_id,device_name,device_type,device_token,expires_at) VALUES (?,'Test','DESKTOP',?,DATE_ADD(NOW(),INTERVAL 1 DAY))",target,id);
        auth=new TestingAuthenticationToken(actorEmail,"unused","ROLE_SYSTEM_ADMIN");
    }
    @AfterEach void cleanup() {
        jdbc.update("DELETE FROM audit_logs WHERE user_id IN (?,?) OR (target_type IN ('USER_ACCOUNT','USER_ROLE') AND target_id IN (?,?))",actor,target,actor,target);
        jdbc.update("DELETE FROM user_devices WHERE user_id IN (?,?)",actor,target);
        jdbc.update("DELETE FROM users WHERE user_id IN (?,?)",actor,target);
    }
    @Test void auditResultsFilterAndCursorWorkInDatabase() throws Exception {
        jdbc.update("INSERT INTO audit_logs(user_id,action,target_type) VALUES (?,'LEGACY_TEST','USER_ACCOUNT')",actor);
        mvc.perform(get("/api/v1/admin/audit-logs/search").with(httpBasic(actorEmail,"test-pass")).param("actor",actorEmail).param("result","UNKNOWN"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].result").value("UNKNOWN"));
        accounts.change(auth,target,"LOCK","Audit test","127.0.0.1");
        mvc.perform(get("/api/v1/admin/audit-logs/search").with(httpBasic(actorEmail,"test-pass")).param("actor",actorEmail).param("result","SUCCESS"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.items[0].action").value("ADMIN_LOCK"));
        for(int i=0;i<51;i++) jdbc.update("INSERT INTO audit_logs(user_id,action,target_type,result) VALUES (?,'FAILURE_TEST','USER_ACCOUNT','FAILURE')",actor);
        var search=new AuditSearchService(new AdminAccess(users,jdbc),jdbc);
        var first=search.search(auth,actorEmail,"","",null,null,null,"FAILURE");
        assertEquals(50,first.items().size());assertNotNull(first.nextCursor());
        var next=search.search(auth,actorEmail,"","",null,null,Long.valueOf(first.nextCursor()),"FAILURE");
        assertEquals(1,next.items().size());assertNull(next.nextCursor());
        assertTrue(first.items().stream().noneMatch(x->x.id().equals(next.items().get(0).id())));
        mvc.perform(get("/api/v1/admin/audit-logs/search").with(httpBasic(actorEmail,"test-pass")).param("result","INVALID")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/admin/audit-logs/search").with(httpBasic(email,"test-pass"))).andExpect(status().isUnauthorized());
    }
    String jwt(){return tokens.issue(users.findById(target).orElseThrow()).accessToken();}
    @Test void lockAndUnlockNeverReviveOldJwtAndBasicRespectsLock() throws Exception {
        String old=jwt();
        mvc.perform(get("/api/v1/auth/me").header("Authorization","Bearer "+old)).andExpect(status().isOk());
        accounts.change(auth,target,"LOCK","Investigation","127.0.0.1");
        mvc.perform(get("/api/v1/auth/me").header("Authorization","Bearer "+old)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/me").with(httpBasic(email,"test-pass"))).andExpect(status().isUnauthorized());
        accounts.change(auth,target,"UNLOCK","Resolved","127.0.0.1");
        mvc.perform(get("/api/v1/auth/me").header("Authorization","Bearer "+old)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/me").header("Authorization","Bearer "+jwt())).andExpect(status().isOk());
        mvc.perform(get("/api/v1/auth/me").with(httpBasic(email,"test-pass"))).andExpect(status().isOk());
    }
    @Test void revokeInvalidatesJwtAndDeviceRowsWithoutLockingAccount() throws Exception {
        String old=jwt();var result=accounts.change(auth,target,"REVOKE","Lost device","127.0.0.1");
        assertEquals(1,result.revokedDevices());assertEquals("ACTIVE",result.status());
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM user_devices WHERE user_id=? AND revoked_at IS NULL",Integer.class,target));
        mvc.perform(get("/api/v1/auth/me").header("Authorization","Bearer "+old)).andExpect(status().isUnauthorized());
        assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE action='ADMIN_REVOKE' AND target_id=?",Integer.class,target));
    }
    @Test void roleChangeRevokesOldJwt() throws Exception {
        String old=jwt();admin.updateRole(auth,target,"AUTHOR","127.0.0.1");
        mvc.perform(get("/api/v1/auth/me").header("Authorization","Bearer "+old)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/me").header("Authorization","Bearer "+jwt())).andExpect(status().isOk()).andExpect(jsonPath("$.role").value("AUTHOR"));
    }
    @Test void selfMutationAndForgedNonAdminAreRejected() {
        for(String action:List.of("LOCK","UNLOCK","REVOKE")) assertEquals(409,assertThrows(ResponseStatusException.class,()->accounts.change(auth,actor,action,"test","127.0.0.1")).getStatusCode().value());
        var forged=new TestingAuthenticationToken(email,"unused","ROLE_SYSTEM_ADMIN");
        assertEquals(403,assertThrows(ResponseStatusException.class,()->accounts.change(forged,actor,"LOCK","test","127.0.0.1")).getStatusCode().value());
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE user_id=?",Integer.class,actor));
    }
    @Test void concurrentAdminsCannotDemoteEachOther() throws Exception {
        jdbc.update("UPDATE users SET role='SYSTEM_ADMIN' WHERE user_id=?",target);
        var other=new TestingAuthenticationToken(email,"unused","ROLE_SYSTEM_ADMIN");
        var start=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(2);
        try {
            var first=pool.submit(()->{start.await();try{admin.updateRole(auth,target,"READER","127.0.0.1");return true;}catch(RuntimeException e){return false;}});
            var second=pool.submit(()->{start.await();try{admin.updateRole(other,actor,"READER","127.0.0.1");return true;}catch(RuntimeException e){return false;}});
            start.countDown();assertNotEquals(first.get(15,TimeUnit.SECONDS),second.get(15,TimeUnit.SECONDS));
            assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE user_id IN (?,?) AND role='SYSTEM_ADMIN'",Integer.class,actor,target));
        } finally {pool.shutdownNow();}
    }
    @Test void auditFailureRollsBackStatusAndTokenVersion() {
        jdbc.execute("CREATE TRIGGER fail_admin_test BEFORE INSERT ON audit_logs FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='test audit failure'");
        try {
            assertThrows(RuntimeException.class,()->accounts.change(auth,target,"LOCK","test","127.0.0.1"));
            assertEquals("ACTIVE",jdbc.queryForObject("SELECT status FROM users WHERE user_id=?",String.class,target));
            assertEquals(0L,jdbc.queryForObject("SELECT auth_version FROM users WHERE user_id=?",Long.class,target));
            assertEquals(1,jdbc.queryForObject("SELECT COUNT(*) FROM user_devices WHERE user_id=? AND revoked_at IS NULL",Integer.class,target));
        } finally {jdbc.execute("DROP TRIGGER fail_admin_test");}
    }
    @Test void httpValidationAndAccessControl() throws Exception {
        String path="/api/v1/admin/users/"+target+"/account-action";
        mvc.perform(post(path).contentType("application/json").content("{}" )).andExpect(status().isUnauthorized());
        mvc.perform(post(path).with(authentication(auth)).contentType("application/json").content("{}" )).andExpect(status().isBadRequest());
        mvc.perform(post(path).with(authentication(auth)).contentType("application/json").content("{\"action\":\"LOCK\",\"reason\":\"Testing\"}" )).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("LOCKED"));
    }
    @Test void temporaryLockIsShownAndBlocksBasicUntilAdminUnlocks() throws Exception {
        jdbc.update("UPDATE users SET locked_until=DATE_ADD(NOW(),INTERVAL 1 HOUR),failed_attempts=5 WHERE user_id=?",target);
        assertFalse(admin.users(auth).stream().filter(u->u.id().equals(Long.toString(target))).findFirst().orElseThrow().isActive());
        mvc.perform(get("/api/v1/auth/me").with(httpBasic(email,"test-pass"))).andExpect(status().isUnauthorized());
        accounts.change(auth,target,"UNLOCK","Resolved temporary lock","127.0.0.1");
        mvc.perform(get("/api/v1/auth/me").with(httpBasic(email,"test-pass"))).andExpect(status().isOk());
        assertEquals(0,jdbc.queryForObject("SELECT failed_attempts FROM users WHERE user_id=?",Integer.class,target));
    }

}
