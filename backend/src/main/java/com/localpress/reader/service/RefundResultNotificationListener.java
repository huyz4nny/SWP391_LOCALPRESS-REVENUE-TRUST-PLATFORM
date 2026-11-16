package com.localpress.reader.service;

import com.localpress.shared.event.RefundCompletedEvent;
import com.localpress.shared.event.RefundRejectedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

// chỉ chạy sau khi transaction hoàn tiền / từ chối của SV4 đã commit
// lỗi ghi thông báo hoặc gửi mail không bao giờ kéo lùi việc hoàn tiền đã xong
@Slf4j
@Component
@RequiredArgsConstructor
public class RefundResultNotificationListener {

    private final RefundResultNotificationService notificationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onRefundCompleted(RefundCompletedEvent event) {
        try {
            notificationService.recordCompleted(event);
        } catch (RuntimeException exception) {
            log.error("Không ghi được thông báo hoàn tiền refundId={}",
                    event == null ? null : event.getRefundId(), exception);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onRefundRejected(RefundRejectedEvent event) {
        try {
            notificationService.recordRejected(event);
        } catch (RuntimeException exception) {
            log.error("Không ghi được thông báo từ chối hoàn tiền refundId={}",
                    event == null ? null : event.getRefundId(), exception);
        }
    }
}
