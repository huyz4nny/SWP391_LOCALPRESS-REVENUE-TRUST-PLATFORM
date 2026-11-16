package com.localpress.finance.service;

import com.localpress.finance.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * ==============================================================================
 * JOB ĐÓNG ĐƠN QUẢNG CÁO QUÁ HẠN (SV4 - Rule 6)
 * ==============================================================================
 * Đơn booking quảng cáo giữ chỗ trong localpress.payment.order-ttl-minutes (15 phút). Hết hạn mà chưa trả
 * thì job chuyển PENDING -> FAILED, để danh sách đơn / chi tiết / sổ quỹ không còn hiện "Chờ thanh toán".
 * Tiền khách lỡ chuyển sau đó vẫn đi nhánh LATE_PAYMENT như cũ (kế toán chuyển trả, LocalPress không giữ tiền).
 * Đơn bài lẻ / gói không có hạn nên không bị đóng.
 * Tắt bằng localpress.payment.expiry-job.enabled=false.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(name = "localpress.payment.expiry-job.enabled", havingValue = "true", matchIfMissing = true)
public class AdOrderExpiryJob {

    private final TransactionRepository transactionRepository;

    @Scheduled(scheduler = "financeScheduler",
            fixedDelayString = "${localpress.payment.expiry-job.delay-ms:60000}",
            initialDelayString = "${localpress.payment.expiry-job.initial-delay-ms:30000}")
    @Transactional
    public int expireOverdueAdOrders() {
        int closed = transactionRepository.expireOverdueAdOrders(LocalDateTime.now());
        if (closed > 0) {
            log.info("Đã đóng {} đơn quảng cáo quá hạn giữ chỗ (PENDING -> FAILED)", closed);
        }
        return closed;
    }

    /** Scheduler riêng của finance, không dùng chung luồng quét URL quảng cáo của SV5. */
    @Configuration
    @EnableScheduling
    static class FinanceSchedulingConfiguration {
        @Bean("financeScheduler")
        ThreadPoolTaskScheduler financeScheduler() {
            ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
            scheduler.setPoolSize(1);
            scheduler.setThreadNamePrefix("finance-job-");
            scheduler.setWaitForTasksToCompleteOnShutdown(false);
            return scheduler;
        }
    }
}
