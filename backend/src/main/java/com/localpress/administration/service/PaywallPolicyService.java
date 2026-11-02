package com.localpress.administration.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;

@Service
public class PaywallPolicyService {
    private static final Duration CACHE_TTL = Duration.ofSeconds(60);
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final Clock clock;
    private volatile CachedSettings cached;

    private record CachedSettings(Settings value, Instant expiresAt) {}

    @Autowired
    public PaywallPolicyService(JdbcTemplate jdbc, ObjectMapper json) {
        this(jdbc, json, Clock.systemDefaultZone());
    }

    public PaywallPolicyService(JdbcTemplate jdbc, ObjectMapper json, Clock clock) {
        this.jdbc = jdbc;
        this.json = json;
        this.clock = clock;
    }

    public record Settings(@Min(1) @Max(500) int previewWordLimit,
                           @Min(2) @Max(2) int maxDevicesAllowed,
                           @AssertTrue boolean paywallEnabled,
                           @Min(15000) @Max(15000) long pricePerArticleDefault,
                           @AssertFalse boolean watermarkEnabled,
                           String lastUpdatedAt, String updatedBy) {}

    public Settings read() {
        CachedSettings entry = cached;
        if (entry != null && clock.instant().isBefore(entry.expiresAt())) return entry.value();
        synchronized (this) {
            entry = cached;
            if (entry == null || !clock.instant().isBefore(entry.expiresAt())) {
                Settings value = load();
                entry = new CachedSettings(value, clock.instant().plus(CACHE_TTL));
                cached = entry;
            }
            return entry.value();
        }
    }

    private Settings load() {
        return jdbc.query("SELECT new_value FROM audit_logs WHERE target_type='PAYWALL_SETTINGS' "
                + "AND action='UPDATE_PAYWALL_SETTINGS' ORDER BY audit_id DESC LIMIT 1", (rs, row) -> {
            try { return json.readValue(rs.getString(1), Settings.class); }
            catch (Exception e) { throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Không đọc được cấu hình Paywall"); }
        }).stream().findFirst().orElse(new Settings(120, 2, true, 15000, false, null, "Mặc định hệ thống"));
    }

    private synchronized void invalidate() { cached = null; }

    @Transactional
    public Settings save(Settings input, Long actorId, String actorName, String ip) {
        if (input.previewWordLimit()<1 || input.previewWordLimit()>500 || input.maxDevicesAllowed()!=2
                || !input.paywallEnabled() || input.pricePerArticleDefault()!=15000 || input.watermarkEnabled())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ hỗ trợ điều chỉnh giới hạn từ xem trước; các chính sách còn lại được cố định");
        Settings saved = new Settings(input.previewWordLimit(), 2, true, 15000, false,
                LocalDateTime.now(clock).toString(), actorName);
        try {
            jdbc.update("INSERT INTO audit_logs(user_id,action,target_type,old_value,new_value,ip_address) "
                    + "VALUES (?,'UPDATE_PAYWALL_SETTINGS','PAYWALL_SETTINGS',?,?,?)", actorId,
                    json.writeValueAsString(read()), json.writeValueAsString(saved), ip);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) { throw new IllegalStateException(e); }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { invalidate(); }
            });
        } else {
            invalidate();
        }
        return saved;
    }
}
