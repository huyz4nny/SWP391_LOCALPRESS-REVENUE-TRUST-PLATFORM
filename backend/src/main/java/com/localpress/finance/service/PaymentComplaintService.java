package com.localpress.finance.service;

import com.localpress.finance.dto.request.CreateComplaintRequest;
import com.localpress.finance.dto.request.SepayIpnRequest;
import com.localpress.finance.dto.response.ComplaintResponse;
import com.localpress.finance.model.PaymentComplaint;
import com.localpress.finance.model.ReconciliationItem;
import com.localpress.finance.model.SepayWebhookLog;
import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.repository.PaymentComplaintRepository;
import com.localpress.finance.repository.ReconciliationItemRepository;
import com.localpress.finance.repository.SepayWebhookLogRepository;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;

/**
 * ==============================================================================
 * DỊCH VỤ KHIẾU NẠI THANH TOÁN CHƯA GHI NHẬN (SV4 - UC051)
 * ==============================================================================
 * Thay cho "duyệt chuyển khoản thủ công". Không có luồng nào để kế toán tự tay
 * đánh dấu PAID:
 * khi kế toán Ghi nhận khiếu nại, hệ thống chạy đúng hàm processSepayIpn như
 * webhook thật
 * (dùng mã giao dịch ngân hàng của khách), nên mọi nhánh đủ/thiếu/thừa/muộn và
 * idempotency giữ nguyên.
 *
 * LocalPress không giữ tiền khách (không có ví), kế toán chọn 1 trong 2 cách xử
 * lý:
 * - ORDER : khoản tiền đúng là của đơn khách khai báo, đúng số tiền, đơn còn
 * chờ -> chạy luồng webhook cho đơn đó.
 * - RETURNED: không gán được vào đơn (sai số tiền, đơn hết hạn / đã trả, không
 * có mã đơn) -> kế toán chuyển trả
 * lại tài khoản khách ngoài hệ thống rồi ghi mã GD chuyển trả vào ghi chú.
 *
 * Chống ghi nhận 2 lần (Rule 5), cả 2 chiều:
 * - Mã GD ngân hàng đã có trong sepay_webhook_logs với kết quả đã ghi tiền ->
 * 409, không ghi nhận lại.
 * - Webhook về sau mang mã GD đã ghi nhận qua khiếu nại: SepayGatewayService bỏ
 * qua (RECORDED_BY_COMPLAINT).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentComplaintService {

    public enum Target {
        ORDER, RETURNED
    }

    /** Kết quả lưu trên khiếu nại khi kế toán đã chuyển trả lại khách. */
    public static final String RETURNED_TO_CUSTOMER = "RETURNED_TO_CUSTOMER";

    private final PaymentComplaintRepository complaintRepository;
    private final TransactionRepository transactionRepository;
    private final PaymentProcessingService paymentProcessingService;
    private final SepayWebhookLogRepository sepayLogRepository;
    private final ReconciliationItemRepository reconciliationItemRepository;

    @Transactional
    public ComplaintResponse create(Long userId, CreateComplaintRequest request) {
        String reference = request.getBankReference().trim().toUpperCase();
        if (complaintRepository.existsByBankReference(reference)) {
            throw new AppException("Mã giao dịch " + reference + " đã được gửi khiếu nại trước đó",
                    HttpStatus.CONFLICT);
        } // check xem đã gửi khiếu nại với mã giao dịch này chưa

        String orderCode = request.getOrderCode() == null || request.getOrderCode().isBlank()
                ? null
                : request.getOrderCode().trim().toUpperCase();
        if (orderCode != null) {
            Transaction tx = transactionRepository.findByGatewayTransactionId(orderCode)
                    .orElseThrow(() -> new AppException("Không tìm thấy đơn hàng " + orderCode, HttpStatus.NOT_FOUND));
            if (!tx.getUserId().equals(userId)) {
                throw new AppException("Bạn không có quyền khiếu nại đơn hàng này", HttpStatus.FORBIDDEN);
            } // Khách có gửi kèm mã đơn ? Nếu có thì kiểm tra xem đơn có thuộc về user không
        }

        PaymentComplaint saved = complaintRepository.save(PaymentComplaint.builder() // lưu kiếu nại vào db
                .userId(userId)
                .orderCode(orderCode)
                .amount(request.getAmount())
                .transferredAt(request.getTransferredAt())
                .bankReference(reference)
                .note(request.getNote())
                .build());
        log.info("User #{} gửi khiếu nại #{}: đơn {}, {} VND, mã GD {}", userId, saved.getComplaintId(),
                orderCode, request.getAmount(), reference);
        return ComplaintResponse.fromEntity(saved); // trả về frontend
    }

    @Transactional(readOnly = true)
    public List<ComplaintResponse> listMine(Long userId) {
        return complaintRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(ComplaintResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public List<ComplaintResponse> listForAccountant(PaymentComplaint.Status status) {
        List<PaymentComplaint> list = status == null
                ? complaintRepository.findAllByOrderByCreatedAtDesc()
                : complaintRepository.findByStatusOrderByCreatedAtAsc(status);
        return list.stream().map(ComplaintResponse::fromEntity).toList();
    }

    /**
     * Kế toán đã thấy khoản tiền trên sao kê -> Ghi nhận.
     */
    @Transactional
    public ComplaintResponse resolve(Long complaintId, Long accountantId, Target target, String note) {
        PaymentComplaint c = lockComplaint(complaintId);
        if (c.getStatus() != PaymentComplaint.Status.OPEN) {
            throw new AppException("Khiếu nại #" + complaintId + " đã được xử lý (" + c.getStatus() + ")",
                    HttpStatus.CONFLICT);
        }
        assertNotRecordedByGateway(c);
        Target effective = target != null ? target : (c.getOrderCode() != null ? Target.ORDER : Target.RETURNED);

        String resultStatus;
        if (effective == Target.ORDER) {
            if (c.getOrderCode() == null) {
                throw new AppException("Khiếu nại không có mã đơn, hãy chuyển trả lại khách", HttpStatus.BAD_REQUEST);
            }
            assertAmountMatchesGateway(c);
            Map<String, Object> result = paymentProcessingService.processSepayIpn(SepayIpnRequest.builder()
                    .content(c.getOrderCode())
                    .amount(c.getAmount())
                    .referenceCode(c.getBankReference())
                    .build());
            resultStatus = String.valueOf(result.get("status"));
            if ("ALREADY_PROCESSED".equals(resultStatus)) {
                throw new AppException("Đơn " + c.getOrderCode() + " đã được ghi nhận trước đó. "
                        + "Nếu sao kê có thêm khoản chuyển này, hãy chuyển trả lại khách.", HttpStatus.CONFLICT);
            }
            if (!"SUCCESS".equals(resultStatus)) {
                // Rollback: không ghi nhận gì, kế toán chọn chuyển trả lại khách
                throw new AppException(result.get("message") + ". Hãy chuyển trả lại khách.", HttpStatus.CONFLICT);
            }
        } else {
            // Đơn còn chờ đúng số tiền thì phải ghi vào đơn, tránh vừa trả lại vừa để
            // webhook thật cấp quyền
            if (c.getOrderCode() != null) {
                transactionRepository.findByGatewayTransactionId(c.getOrderCode())
                        .filter(tx -> tx.getStatus() == TransactionStatus.PENDING
                                && !tx.isPaymentWindowClosed(LocalDateTime.now())
                                && tx.getAmount().compareTo(c.getAmount()) == 0)
                        .ifPresent(tx -> {
                            throw new AppException(
                                    "Đơn " + c.getOrderCode() + " vẫn đang chờ đúng số tiền này, hãy ghi nhận vào đơn",
                                    HttpStatus.CONFLICT);
                        });
            }
            if (note == null || note.isBlank()) {
                throw new AppException("Nhập mã giao dịch chuyển trả lại khách vào ghi chú", HttpStatus.BAD_REQUEST);
            }
            resultStatus = RETURNED_TO_CUSTOMER;
        }

        c.resolve(accountantId, resultStatus, note);
        log.info("Kế toán #{} xử lý khiếu nại #{} -> {}", accountantId, complaintId, resultStatus);
        return ComplaintResponse.fromEntity(complaintRepository.save(c));
    }

    /**
     * Không thấy khoản tiền trên sao kê -> Từ chối, bắt buộc có lý do để báo khách.
     */
    @Transactional
    public ComplaintResponse reject(Long complaintId, Long accountantId, String reason) {
        PaymentComplaint c = lockComplaint(complaintId);
        c.reject(accountantId, reason);
        log.info("Kế toán #{} từ chối khiếu nại #{}: {}", accountantId, complaintId, reason);
        return ComplaintResponse.fromEntity(complaintRepository.save(c));
    }

    /**
     * Sao kê chỉ cho biết tiền đã về ngân hàng, không cho biết hệ thống đã ghi
     * chưa. Tra nhật ký SePay theo
     * mã GD: webhook / đồng bộ API đã ghi tiền (đơn SUCCESS) thì không cho ghi nhận
     * lần 2.
     */
    private void assertNotRecordedByGateway(PaymentComplaint c) {
        sepayLogRepository.findFirstByReferenceCodeAndResultStatusInOrderByReceivedAtAsc(
                c.getBankReference(), SepayWebhookLog.MONEY_RECORDED_STATUSES)
                .ifPresent(logEntry -> {
                    throw new AppException("Mã GD " + c.getBankReference() + " đã được SePay ghi nhận tự động ("
                            + logEntry.getResultStatus() + ", mã " + logEntry.getOrderCode()
                            + "). Hãy từ chối khiếu nại và báo khách kiểm tra đơn hàng.", HttpStatus.CONFLICT);
                });
        // Kế toán đã gán khoản này vào đơn / đã trả lại khách khi đối soát kỳ (UC054)
        if (reconciliationItemRepository.existsByReferenceCodeAndStatusAndActionIn(c.getBankReference(),
                ReconciliationItem.Status.RESOLVED,
                EnumSet.of(ReconciliationItem.Action.ASSIGN_ORDER, ReconciliationItem.Action.RETURNED_TO_CUSTOMER))) {
            throw new AppException("Mã GD " + c.getBankReference() + " đã được ghi nhận khi đối soát kỳ. "
                    + "Hãy từ chối khiếu nại và báo khách kiểm tra đơn hàng.", HttpStatus.CONFLICT);
        }
    }

    /**
     * Số tiền trên khiếu nại do khách tự khai. SePay đã báo về mã GD này (vd
     * AMOUNT_MISMATCH) thì lấy số SePay báo làm chuẩn:
     * khác số khách khai -> 409, không ghi nhận vào đơn (Rule 4). Chưa có log thì
     * kế toán đối chiếu sao kê như cũ.
     */
    private void assertAmountMatchesGateway(PaymentComplaint c) {
        sepayLogRepository
                .findFirstByReferenceCodeAndAuthOkTrueAndTransferAmountNotNullOrderByReceivedAtAsc(c.getBankReference())
                .filter(logEntry -> logEntry.getTransferAmount().compareTo(c.getAmount()) != 0)
                .ifPresent(logEntry -> {
                    throw new AppException("SePay báo mã GD " + c.getBankReference() + " là "
                            + logEntry.getTransferAmount().toPlainString() + " VND, khác số khách khai "
                            + c.getAmount().toPlainString() + " VND. Hãy chuyển trả lại khách.", HttpStatus.CONFLICT);
                });
    }

    private PaymentComplaint lockComplaint(Long complaintId) {
        return complaintRepository.findByIdForUpdate(complaintId)
                .orElseThrow(() -> new AppException("Không tìm thấy khiếu nại #" + complaintId, HttpStatus.NOT_FOUND));
    }
}
