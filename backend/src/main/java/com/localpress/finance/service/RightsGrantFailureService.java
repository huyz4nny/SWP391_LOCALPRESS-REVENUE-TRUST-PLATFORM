package com.localpress.finance.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.shared.event.RightsGrantFailedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tiền đã về nhưng module nguồn không cấp được quyền (RightsGrantFailedEvent, Rule 5).
 * Ghi audit_logs action RIGHTS_GRANT_FAILED (một dòng mỗi giao dịch), không cần bảng mới.
 * Một lỗi được coi là đã xử lý khi giao dịch đó đã có đề xuất hoàn tiền chưa bị từ chối.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RightsGrantFailureService {

    static final String ACTION = "RIGHTS_GRANT_FAILED";

    private static final String UNRESOLVED = """
            FROM audit_logs l JOIN transactions t ON t.transaction_id = l.target_id
            WHERE l.action = 'RIGHTS_GRANT_FAILED' AND l.target_type = 'transactions'
              AND NOT EXISTS (SELECT 1 FROM refund_requests r
                              WHERE r.transaction_id = l.target_id AND r.status <> 'REJECTED')
            """;

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    /** Chạy sau khi giao dịch tiền commit (tiền chắc chắn đã ghi nhận), trong transaction riêng, không ném lỗi. */
    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onRightsGrantFailed(RightsGrantFailedEvent event) {
        if (event == null || event.getTransactionId() == null) return;
        try {
            Map<String, Object> detail = new LinkedHashMap<>();
            detail.put("transactionType", event.getTransactionType());
            detail.put("targetId", event.getTargetId());
            detail.put("userId", event.getUserId());
            detail.put("amount", event.getAmount());
            detail.put("sourceModule", event.getSourceModule());
            detail.put("reason", event.getReason());
            // Sự kiện lặp (webhook gửi lại, kế toán ghi nhận khiếu nại) chỉ ghi một lần
            int inserted = jdbc.update("""
                    INSERT INTO audit_logs (user_id, action, target_type, target_id, new_value)
                    SELECT NULL, ?, 'transactions', ?, ? FROM DUAL
                    WHERE NOT EXISTS (SELECT 1 FROM audit_logs
                                      WHERE action = ? AND target_type = 'transactions' AND target_id = ?)
                    """, ACTION, event.getTransactionId(), json.writeValueAsString(detail), ACTION, event.getTransactionId());
            log.warn("Không cấp được quyền cho giao dịch #{} ({} #{}, {}): {} -> {}", event.getTransactionId(),
                    event.getTransactionType(), event.getTargetId(), event.getSourceModule(), event.getReason(),
                    inserted == 1 ? "đưa vào cảnh báo" : "đã ghi trước đó");
        } catch (Exception e) {
            log.error("Không ghi được lỗi cấp quyền của giao dịch #{}", event.getTransactionId(), e);
        }
    }

    /** Số giao dịch đã thu tiền mà chưa cấp được quyền và chưa có đề xuất hoàn. */
    public long countUnresolved() {
        Long n = jdbc.queryForObject("SELECT COUNT(*) " + UNRESOLVED, Long.class);
        return n != null ? n : 0;
    }

    /** Mã đơn của các lỗi chưa xử lý, mới nhất trước, để kế toán tra trên màn đơn hàng / hoàn tiền. */
    public List<String> unresolvedOrderCodes(int limit) {
        return jdbc.queryForList("SELECT t.gateway_transaction_id " + UNRESOLVED + " ORDER BY l.audit_id DESC LIMIT ?",
                String.class, limit);
    }
}
