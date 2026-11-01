package com.localpress.finance.service;

import com.localpress.finance.dto.request.ProposeRefundRequest;
import com.localpress.finance.dto.request.ReviewRefundRequest;
import com.localpress.finance.dto.response.RefundDetailResponse;
import com.localpress.finance.model.RefundRequest;
import com.localpress.finance.model.RefundStatus;
import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.model.TransactionType;
import com.localpress.finance.repository.RefundRequestRepository;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.shared.event.RefundCompletedEvent;
import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * ==============================================================================
 * DỊCH VỤ QUẢN LÝ HOÀN TIỀN 4 MẮT & THU HỒI QUYỀN LỢI (SV4 - UC055, UC056)
 * ==============================================================================
 * Tuân thủ bất biến:
 * 1. Rule 11 (Refund Cap): Tổng số tiền hoàn qua các đợt không vượt quá số tiền thực thu.
 * 2. Four-Eyes Principle: Người đề xuất != Người phê duyệt.
 * 3. UC056 theo Rule 17: SV4 chỉ xử lý tiền (bút toán REFUND, hoàn ví) rồi phát RefundCompletedEvent.
 *    Thu hồi quyền đọc / hủy gói (SV3) và dừng chiến dịch (SV1) do module sở hữu tự làm qua @EventListener,
 *    SV4 không sửa bảng article_purchases / subscriptions / ad_campaigns.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RefundManagementService {

    /** Tên hiển thị khi đề xuất do hệ thống lập (proposed_by NULL). */
    static final String SYSTEM_PROPOSER = "Hệ thống";

    private final RefundRequestRepository refundRequestRepository;
    private final TransactionRepository transactionRepository;
    private final JdbcTemplate jdbcTemplate;
    private final WalletService walletService;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * UC055: Lấy danh sách tất cả các yêu cầu hoàn tiền.
     */
    @Transactional(readOnly = true)
    public List<RefundDetailResponse> getRefundsList() {
        log.info("Lấy danh sách yêu cầu hoàn tiền 4 mắt");

        String sql = """
            SELECT 
                r.refund_id,
                r.transaction_id,
                t.gateway_transaction_id AS order_code,
                t.amount AS original_amount,
                t.transaction_type,
                t.purchase_id,
                t.subscription_id,
                t.campaign_id,
                r.user_id,
                u.full_name AS user_name,
                u.email AS user_email,
                r.refund_amount,
                r.reason,
                r.evidence_url,
                r.status,
                r.proposed_by,
                p.full_name AS proposed_by_name,
                r.reviewed_by,
                rev.full_name AS reviewed_by_name,
                r.review_notes,
                r.created_at,
                r.resolved_at
            FROM refund_requests r
            JOIN transactions t ON r.transaction_id = t.transaction_id
            JOIN users u ON r.user_id = u.user_id
            LEFT JOIN users p ON r.proposed_by = p.user_id
            LEFT JOIN users rev ON r.reviewed_by = rev.user_id
            ORDER BY r.created_at DESC
        """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> {
            BigDecimal originalAmount = rs.getBigDecimal("original_amount");
            BigDecimal refundAmount = rs.getBigDecimal("refund_amount");
            boolean isPartial = originalAmount != null && refundAmount.compareTo(originalAmount) < 0;

            return RefundDetailResponse.builder()
                    .id(String.valueOf(rs.getLong("refund_id")))
                    .orderId(String.valueOf(rs.getLong("transaction_id")))
                    .orderCode(rs.getString("order_code"))
                    .transactionId(String.valueOf(rs.getLong("transaction_id")))
                    .userId(String.valueOf(rs.getLong("user_id")))
                    .userName(rs.getString("user_name"))
                    .userEmail(rs.getString("user_email"))
                    .originalAmount(originalAmount)
                    .refundAmount(refundAmount)
                    .isPartial(isPartial)
                    .reason(rs.getString("reason"))
                    .evidenceUrl(rs.getString("evidence_url"))
                    .status(rs.getString("status"))
                    .affectedBenefit("Thu hồi quyền lợi của đơn " + rs.getString("order_code") + " (" + rs.getString("transaction_type") + ")")
                    .requestedAt(localDateTime(rs, "created_at"))
                    .proposedBy(rs.getString("proposed_by"))
                    // Không có người lập = module khác tự lập khi tiền về mà không kích hoạt được (vd SV1)
                    .proposedByName(rs.getString("proposed_by") == null ? SYSTEM_PROPOSER : rs.getString("proposed_by_name"))
                    .reviewedBy(rs.getString("reviewed_by"))
                    .reviewedByName(rs.getString("reviewed_by_name"))
                    .reviewNotes(rs.getString("review_notes"))
                    .resolvedAt(localDateTime(rs, "resolved_at"))
                    .build();
        });
    }

    /**
     * UC055: Kế toán viên lập đề xuất hoàn tiền (Mắt 1 & 2).
     * Kiểm tra chặt chẽ Rule 11 (Refund Cap).
     */
    @Transactional
    public RefundDetailResponse proposeRefund(Long proposerUserId, ProposeRefundRequest request) {
        log.info("Lập đề xuất hoàn tiền: proposer={}, orderId={}, amount={}",
                proposerUserId, request.getOrderId(), request.getRefundAmount());

        Transaction originalTx = transactionRepository.findById(request.getOrderId())
                .orElseThrow(() -> new AppException("Không tìm thấy đơn hàng #" + request.getOrderId(), HttpStatus.NOT_FOUND));

        // Dữ liệu cũ có thể thiếu transaction_type: chỉ chặn khi biết chắc là TOPUP / REFUND
        if (originalTx.getTransactionType() != null && !originalTx.getTransactionType().isPurchase()) {
            throw new AppException(
                    "Không thể hoàn tiền cho giao dịch loại " + originalTx.getTransactionType() + " (chỉ hoàn đơn mua bài, gói hoặc quảng cáo)",
                    HttpStatus.BAD_REQUEST
            );
        }

        if (originalTx.getStatus() != TransactionStatus.SUCCESS) {
            throw new AppException(
                    "Chỉ có thể đề xuất hoàn tiền cho giao dịch đã thanh toán thành công (Hiện tại: " + originalTx.getStatus() + ")",
                    HttpStatus.BAD_REQUEST
            );
        }

        // Kiểm tra Rule 11: Tổng tiền hoàn không vượt quá số tiền thực thu của đơn gốc
        BigDecimal availableRefundCap = originalTx.getAmount().subtract(committedRefunds(originalTx).orElse(BigDecimal.ZERO));

        if (request.getRefundAmount().compareTo(availableRefundCap) > 0) {
            throw new AppException(
                    String.format("Vi phạm Rule 11 (Refund Cap): Số tiền hoàn (%,.0f đ) vượt quá hạn mức được phép hoàn còn lại của đơn hàng (%,.0f đ).",
                            request.getRefundAmount(), availableRefundCap),
                    HttpStatus.BAD_REQUEST
            );
        }

        RefundRequest savedRefund = refundRequestRepository.save(RefundRequest.builder()
                .transactionId(originalTx.getTransactionId())
                .userId(originalTx.getUserId())
                .refundAmount(request.getRefundAmount())
                .reason(request.getReason())
                .evidenceUrl(request.getEvidenceUrl())
                .status(RefundStatus.PENDING)
                .proposedBy(proposerUserId)
                .build());
        log.info("Đã lập thành công phiếu đề xuất hoàn tiền #{} cho giao dịch #{}",
                savedRefund.getRefundId(), originalTx.getTransactionId());

        return RefundDetailResponse.builder()
                .id(String.valueOf(savedRefund.getRefundId()))
                .orderId(String.valueOf(originalTx.getTransactionId()))
                .orderCode(originalTx.getGatewayTransactionId())
                .transactionId(String.valueOf(originalTx.getTransactionId()))
                .userId(String.valueOf(originalTx.getUserId()))
                .originalAmount(originalTx.getAmount())
                .refundAmount(savedRefund.getRefundAmount())
                .isPartial(request.getRefundAmount().compareTo(originalTx.getAmount()) < 0)
                .reason(savedRefund.getReason())
                .evidenceUrl(savedRefund.getEvidenceUrl())
                .status(savedRefund.getStatus().name())
                .affectedBenefit(request.getAffectedBenefit())
                .requestedAt(savedRefund.getCreatedAt())
                .proposedBy(proposerUserId == null ? null : String.valueOf(proposerUserId))
                .proposedByName(proposerUserId == null ? SYSTEM_PROPOSER : null)
                .build();
    }

    /**
     * UC055 & UC056: Kế toán trưởng phê duyệt / từ chối hoàn tiền (Mắt 3 & 4)
     * và thu hồi quyền lợi tương ứng.
     */
    @Transactional
    public RefundDetailResponse reviewRefund(Long reviewerUserId, Long refundId, ReviewRefundRequest request) {
        log.info("Phê duyệt hoàn tiền #{}: reviewer={}, approved={}", refundId, reviewerUserId, request.isApproved());

        RefundRequest refund = refundRequestRepository.findById(refundId)
                .orElseThrow(() -> new AppException("Không tìm thấy yêu cầu hoàn tiền #" + refundId, HttpStatus.NOT_FOUND));

        if (refund.getStatus() != RefundStatus.PENDING) {
            throw new AppException("Yêu cầu hoàn tiền #" + refundId + " đã được xử lý trước đó (Trạng thái: " + refund.getStatus() + ")", HttpStatus.CONFLICT);
        }

        // Kiểm tra nguyên tắc 4 mắt (Four-Eyes Principle): Người lập không được tự duyệt
        if (refund.getProposedBy() != null && refund.getProposedBy().equals(reviewerUserId)) {
            throw new AppException(
                    "Vi phạm nguyên tắc kiểm soát 4 mắt (Four-Eyes Principle): Người đề xuất không được tự phê duyệt yêu cầu hoàn tiền của chính mình!",
                    HttpStatus.FORBIDDEN
            );
        }

        LocalDateTime now = LocalDateTime.now();
        refund.setReviewedBy(reviewerUserId);
        refund.setReviewNotes(request.getReviewNotes());
        refund.setResolvedAt(now);

        Transaction originalTx = transactionRepository.findById(refund.getTransactionId())
                .orElseThrow(() -> new AppException("Không tìm thấy đơn hàng gốc #" + refund.getTransactionId(), HttpStatus.NOT_FOUND));

        refund.setStatus(request.isApproved() ? RefundStatus.COMPLETED : RefundStatus.REJECTED);
        refundRequestRepository.save(refund);

        if (!request.isApproved()) {
            log.info("Yêu cầu hoàn tiền #{} đã bị từ chối bởi Reviewer #{}", refundId, reviewerUserId);
        } else {
            // 1. Tạo bút toán đảo hoàn tiền trong transactions (Bút toán kép kế toán)
            Transaction savedRefundTx = transactionRepository.save(Transaction.builder()
                    .userId(refund.getUserId())
                    .originalTransactionId(originalTx.getTransactionId())
                    .transactionType(TransactionType.REFUND)
                    .amount(refund.getRefundAmount())
                    .currency(originalTx.getCurrency())
                    .paymentMethod(originalTx.getPaymentMethod())
                    .gatewayTransactionId("REFUND-" + refund.getRefundId() + "-" + (System.currentTimeMillis() % 100000))
                    .status(TransactionStatus.SUCCESS)
                    .paidAt(now)
                    .reconciledAt(now)
                    .reconciledBy(reviewerUserId)
                    .build());

            // Đơn đã trả bằng Ví LocalPress: tiền hoàn trả lại vào ví (idempotent theo UNIQUE(transaction_id, direction)).
            // Đơn trả qua QR SePay: tiền chuyển trả khách ngoài hệ thống, chỉ ghi bút toán đảo.
            if ("WALLET".equals(originalTx.getPaymentMethod())) {
                walletService.credit(savedRefundTx, refund.getRefundAmount(),
                        "Hoàn tiền đơn " + originalTx.getGatewayTransactionId() + " (yêu cầu #" + refund.getRefundId() + ")");
            }

            // 2. Cập nhật trạng thái đơn gốc sang REFUNDED nếu đã hoàn toàn bộ
            BigDecimal totalRefunded = committedRefunds(originalTx).orElse(refund.getRefundAmount());
            boolean fullRefund = totalRefunded.compareTo(originalTx.getAmount()) >= 0;
            if (fullRefund) {
                originalTx.setStatus(TransactionStatus.REFUNDED);
                transactionRepository.save(originalTx);
            }

            // 3. UC056 (Rule 17): phát sự kiện, module SV1 / SV3 tự điều chỉnh quyền của đối tượng mình sở hữu
            RefundCompletedEvent event = buildRefundEvent(refund, originalTx, savedRefundTx, totalRefunded, fullRefund, now);
            eventPublisher.publishEvent(event);
            log.info("Đã hoàn tất hoàn tiền #{} cho đơn #{}, phát RefundCompletedEvent {}#{} (fullRefund={})",
                    refundId, originalTx.getTransactionId(), event.getTransactionType(), event.getTargetId(), fullRefund);
        }

        return RefundDetailResponse.builder()
                .id(String.valueOf(refund.getRefundId()))
                .orderId(String.valueOf(originalTx.getTransactionId()))
                .orderCode(originalTx.getGatewayTransactionId())
                .status(refund.getStatus().name())
                .refundAmount(refund.getRefundAmount())
                .reviewedBy(String.valueOf(reviewerUserId))
                .reviewNotes(refund.getReviewNotes())
                .resolvedAt(refund.getResolvedAt())
                .build();
    }

    /**
     * UC056: Đóng gói thông tin cho module sở hữu đối tượng. Loại đơn suy từ khóa ngoại đang có
     * (purchase / subscription / campaign) để vẫn đúng với dữ liệu cũ chưa ghi transaction_type.
     */
    private RefundCompletedEvent buildRefundEvent(RefundRequest refund, Transaction originalTx, Transaction refundTx,
                                                  BigDecimal totalRefunded, boolean fullRefund, LocalDateTime now) {
        String type;
        Long targetId;
        if (originalTx.getPurchaseId() != null) {
            type = TransactionType.ARTICLE.name();
            targetId = originalTx.getPurchaseId();
        } else if (originalTx.getSubscriptionId() != null) {
            type = TransactionType.SUBSCRIPTION.name();
            targetId = originalTx.getSubscriptionId();
        } else if (originalTx.getCampaignId() != null) {
            type = TransactionType.AD.name();
            targetId = originalTx.getCampaignId();
        } else {
            type = originalTx.getTransactionType() != null ? originalTx.getTransactionType().name() : null;
            targetId = null;
        }
        return RefundCompletedEvent.builder()
                .refundId(refund.getRefundId())
                .originalTransactionId(originalTx.getTransactionId())
                .refundTransactionId(refundTx != null ? refundTx.getTransactionId() : null)
                .userId(originalTx.getUserId())
                .transactionType(type)
                .targetId(targetId)
                .refundAmount(refund.getRefundAmount())
                .totalRefunded(totalRefunded)
                .originalAmount(originalTx.getAmount())
                .fullRefund(fullRefund)
                .paymentMethod(originalTx.getPaymentMethod())
                .reason(refund.getReason())
                .refundedAt(now)
                .build();
    }

    /** Rule 11: tổng tiền hoàn đã chốt hoặc đang chờ duyệt của đơn (rỗng khi chưa có phiếu nào). */
    private Optional<BigDecimal> committedRefunds(Transaction originalTx) {
        return Optional.ofNullable(refundRequestRepository.sumCommittedRefundsByTransactionId(originalTx.getTransactionId(), null));
    }

    private static LocalDateTime localDateTime(ResultSet rs, String column) throws SQLException {
        Timestamp ts = rs.getTimestamp(column);
        return ts != null ? ts.toLocalDateTime() : null;
    }
}
