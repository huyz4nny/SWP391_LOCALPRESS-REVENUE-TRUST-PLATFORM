package com.localpress.administration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.administration.service.PaywallPolicyService;
import com.localpress.administration.service.PaywallPolicyService.Settings;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PaywallPolicyTest {
    @Test void unsupportedSettingsCannotDisablePremiumProtection() {
        var jdbc=mock(JdbcTemplate.class);
        var service=new PaywallPolicyService(jdbc,new ObjectMapper());
        for(var invalid:new Settings[]{new Settings(120,2,false,15000,false,null,null),new Settings(120,5,true,15000,false,null,null),
                new Settings(120,2,true,15000,true,null,null),new Settings(0,2,true,15000,false,null,null)})
            assertEquals(400,assertThrows(ResponseStatusException.class,()->service.save(invalid,1L,"Admin","127.0.0.1")).getStatusCode().value());
        verifyNoInteractions(jdbc);
    }
    @Test void configuredPreviewLimitIsPersistedWithServerActorAndTimestamp() {
        var jdbc=mock(JdbcTemplate.class);
        var service=new PaywallPolicyService(jdbc,new ObjectMapper());
        var saved=service.save(new Settings(80,2,true,15000,false,"forged-time","forged-user"),1L,"Actual admin","127.0.0.1");
        assertEquals(80,saved.previewWordLimit());
        assertEquals("Actual admin",saved.updatedBy());
        assertNotEquals("forged-time",saved.lastUpdatedAt());
        verify(jdbc).update(contains("INSERT INTO audit_logs"),eq(1L),anyString(),contains("Actual admin"),eq("127.0.0.1"));
    }
}
