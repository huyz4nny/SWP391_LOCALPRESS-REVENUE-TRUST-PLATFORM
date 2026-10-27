package com.localpress.finance.service;

import com.localpress.finance.dto.request.CreateComplaintRequest;
import com.localpress.finance.dto.request.SepayIpnRequest;
import com.localpress.finance.dto.response.ComplaintResponse;
import com.localpress.finance.model.PaymentComplaint;
import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.repository.PaymentComplaintRepository;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * ==============================================================================
 * DỊCH VỤ KHIẾU NẠI THANH TOÁN CHƯA GHI NHẬN (SV4 - UC051)
 * ==============================================================================
 * Thay cho "duyệt chuyển khoản thủ công". Không có luồng nào để kế toán tự tay đánh dấu PAID:
 * khi kế toán Ghi nhận khiếu nại, hệ thống chạy đúng hàm processSepayIpn như webhook thật
 * (dùng mã giao dịch ngân hàng của khách), nên mọi nhánh đủ/thiếu/thừa/muộn và idempotency giữ nguyên.
 *
 * Kế toán chọn đích ghi nhận:
 *  - ORDER : khoản tiền là của đơn khách khai báo -> chạy luồng webhook cho đơn đó.
 *  - WALLET: không xác định được đơn, hoặc là khoản chuyển thêm -> cộng thẳng vào ví khách.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentComplaintService {

    public enum Target { ORDER, WALLET }

    private final PaymentComplaintRepository complaintRepository;
    private final TransactionRepository transactionRepository;
    private final PaymentProcessingService paymentProcessingService;

    @Transactional
    public ComplaintResponse create(Long userId, CreateComplaintRequest request) {
        String reference = request.getBankReference().trim().toUpperCase();
        if (complaintRepository.existsByBankReference(reference)) {
            throw new AppException("Mã giao dịch " + reference + " đã được gửi khiếu nại trước đó", HttpStatus.CONFLICT);
        }

        String orderCode = request.getOrderCode() == null || request.getOrderCode().isBlank()
                ? null
                : request.getOrderCode().trim().toUpperCase();
        if (orderCode != null) {
            Transaction tx = transactionRepository.findByGatewayTransactionId(orderCode)
                    .orElseThrow(() -> new AppException("Không tìm thấy đơn hàng " + orderCode, HttpStatus.NOT_FOUND));
            if (!tx.getUserId().equals(userId)) {
                throw new AppException("Bạn không có quyền khiếu nại đơn hàng này", HttpStatus.FORBIDDEN);
            }
        }

        PaymentComplaint saved = complaintRepository.save(PaymentComplaint.builder()
                .userId(userId)
                .orderCode(orderCode)
                .amount(request.getAmount())
                .transferredAt(request.getTransferredAt())
                .bankReference(reference)
                .note(request.getNote())
                .build());
        log.info("User #{} gửi khiếu nại #{}: đơn {}, {} VND, mã GD {}", userId, saved.getComplaintId(),
                orderCode, request.getAmount(), reference);
        return ComplaintResponse.fromEntity(saved);
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
            throw new AppException("Khiếu nại #" + complaintId + " đã được xử lý (" + c.getStatus() + ")", HttpStatus.CONFLICT);
        }
        Target effective = target != null ? target : (c.getOrderCode() != null ? Target.ORDER : Target.WALLET);

        Map<String, Object> result;
        if (effective == Target.ORDER) {
            if (c.getOrderCode() == null) {
                throw new AppException("Khiếu nại không có mã đơn, hãy chọn cộng vào ví", HttpStatus.BAD_REQUEST);
            }
            result = paymentProcessingService.processSepayIpn(SepayIpnRequest.builder()
                    .content(c.getOrderCode())
                    .amount(c.getAmount())
                    .referenceCode(c.getBankReference())
                    .build());
            if ("ALREADY_PROCESSED".equals(result.get("status"))) {
                throw new AppException("Đơn " + c.getOrderCode() + " đã được ghi nhận trước đó. "
                        + "Nếu sao kê có thêm khoản chuyển này, hãy chọn cộng vào ví.", HttpStatus.CONFLICT);
            }
        } else {
            // Đơn còn chờ thanh toán mà cộng ví thì webhook thật về sau sẽ ghi nhận lần 2
            if (c.getOrderCode() != null) {
                transactionRepository.findByGatewayTransactionId(c.getOrderCode())
                        .filter(tx -> tx.getStatus() == TransactionStatus.PENDING && !tx.isExpired(LocalDateTime.now()))
                        .ifPresent(tx -> {
                            throw new AppException("Đơn " + c.getOrderCode() + " vẫn đang chờ thanh toán, hãy ghi nhận vào đơn",
                                    HttpStatus.CONFLICT);
                        });
            }
            result = paymentProcessingService.creditUnmatchedTransfer(c.getUserId(), c.getAmount(),
                    "CMP-" + c.getBankReference(), "Ghi nhận khiếu nại #" + c.getComplaintId() + " (mã GD " + c.getBankReference() + ")");
        }

        c.resolve(accountantId, String.valueOf(result.get("status")), note);
        log.info("Kế toán #{} ghi nhận khiếu nại #{} -> {}", accountantId, complaintId, result.get("status"));
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

    private PaymentComplaint lockComplaint(Long complaintId) {
        return complaintRepository.findByIdForUpdate(complaintId)
                .orElseThrow(() -> new AppException("Không tìm thấy khiếu nại #" + complaintId, HttpStatus.NOT_FOUND));
    }
}
