package com.localpress.administration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.administration.service.PaywallPolicyService;
import com.localpress.administration.service.PaywallPolicyService.Settings;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.time.*;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PaywallPolicyCacheTest {
    @AfterEach void cleanup() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) TransactionSynchronizationManager.clearSynchronization();
    }
    static class MutableClock extends Clock {
        Instant now = Instant.parse("2026-10-31T00:00:00Z");
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return Clock.fixed(now,zone); }
        public Instant instant() { return now; }
    }
    Settings settings(int limit) { return new Settings(limit,2,true,15000,false,null,"Admin"); }

    @Test @SuppressWarnings("unchecked") void repeatedReadsUseCacheAndRefreshAfterSixtySeconds() {
        var jdbc = mock(JdbcTemplate.class);
        var clock = new MutableClock();
        when(jdbc.query(anyString(),any(RowMapper.class))).thenReturn(List.of(settings(120)),List.of(settings(80)));
        var service = new PaywallPolicyService(jdbc,new ObjectMapper(),clock);
        assertEquals(120,service.read().previewWordLimit());
        for(int i=0;i<100;i++) assertEquals(120,service.read().previewWordLimit());
        verify(jdbc,times(1)).query(anyString(),any(RowMapper.class));
        clock.now = clock.now.plusSeconds(60);
        assertEquals(80,service.read().previewWordLimit());
        verify(jdbc,times(2)).query(anyString(),any(RowMapper.class));
    }

    @Test @SuppressWarnings("unchecked") void cacheIsInvalidatedOnlyAfterTheSaveTransactionCommits() {
        var jdbc = mock(JdbcTemplate.class);
        when(jdbc.query(anyString(),any(RowMapper.class))).thenReturn(List.of(settings(120)),List.of(settings(80)));
        var service = new PaywallPolicyService(jdbc,new ObjectMapper());
        service.read();
        TransactionSynchronizationManager.initSynchronization();
        service.save(settings(80),1L,"Admin","127.0.0.1");
        assertEquals(120,service.read().previewWordLimit());
        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
        assertEquals(80,service.read().previewWordLimit());
        verify(jdbc,times(2)).query(anyString(),any(RowMapper.class));
    }

    @Test @SuppressWarnings("unchecked") void rolledBackSaveDoesNotPublishUncommittedSettings() {
        var jdbc = mock(JdbcTemplate.class);
        when(jdbc.query(anyString(),any(RowMapper.class))).thenReturn(List.of(settings(120)));
        var service = new PaywallPolicyService(jdbc,new ObjectMapper());
        service.read();
        TransactionSynchronizationManager.initSynchronization();
        service.save(settings(80),1L,"Admin","127.0.0.1");
        TransactionSynchronizationManager.getSynchronizations().forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
        assertEquals(120,service.read().previewWordLimit());
        verify(jdbc,times(1)).query(anyString(),any(RowMapper.class));
    }
}
