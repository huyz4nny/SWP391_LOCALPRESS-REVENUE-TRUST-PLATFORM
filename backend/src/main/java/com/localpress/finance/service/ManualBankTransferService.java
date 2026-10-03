package com.localpress.finance.service;

import com.localpress.finance.dto.request.ManualTransferConfirmRequest;
import com.localpress.finance.dto.request.ManualTransferRejectRequest;
import com.localpress.finance.dto.response.TransactionDetailResponse;
import com.localpress.finance.dto.response.TransactionLedgerResponse;
import com.localpress.finance.model.Transaction;
import com.localpress.finance.model.TransactionStatus;
import com.localpress.finance.repository.TransactionRepository;
import com.localpress.shared.event.PaymentSuccessEvent;
import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * ==============================================================================
 * SERVICE: XÁC NHẬN CHUYỂN KHOẢN NGÂN HÀNG THỦ CÔNG (UC050, UC051)
 * ==============================================================================
 * - Phân hệ: com.localpress.finance (SV4 - Huy)
 * - Màn hình tương ứng: II.4.2 Manual Bank Transfer Confirmation
 * - Kiến trúc Phương án 2 (Decoupled Domain Events):
 *   + Khi Kế toán bấm "Xác nhận đã nhận tiền": Service cập nhật trạng thái Transaction = SUCCESS
 *     và publish PaymentSuccessEvent qua Spring ApplicationEventPublisher.
 *   + Các module SV1 (Advertising) và SV3 (Reader) sẽ tự động lắng nghe event này để kích hoạt
 *     quyền đọc báo hoặc active chiến dịch quảng cáo tương ứng.
 *   + Tuyệt đối không can thiệp hay phụ thuộc trực tiếp vào code của SV1/SV3 (Tuân thủ Quy tắc 17).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ManualBankTransferService {

    private final TransactionRepository transactionRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Danh sách phương thức chuyển khoản ngân hàng cần Kế toán duyệt thủ công.
     */
    private static final List<String> MANUAL_PAYMENT_METHODS = List.of(
            "BANK_TRANSFER",
            "MANUAL_BANK_TRANSFER"
    );

    /**
     * UC050: Lấy danh sách hàng đợi các đơn chuyển khoản đang chờ duyệt (PENDING).
     *
     * @param page Số trang (0-indexed).
     * @param size Kích thước trang.
     * @return Trang danh sách TransactionLedgerResponse các giao dịch chờ duyệt.
     */
    @Transactional(readOnly = true)
    public Page<TransactionLedgerResponse> getPendingQueue(int page, int size) {
        int validPage = Math.max(0, page);
        int validSize = size <= 0 ? 15 : Math.min(size, 100);
        Pageable pageable = PageRequest.of(validPage, validSize, Sort.by(Sort.Direction.ASC, "createdAt"));

        log.info("Lấy hàng đợi chuyển khoản thủ công chờ duyệt (page: {}, size: {})", validPage, validSize);

        Page<Transaction> pendingPage = transactionRepository.findByStatusAndPaymentMethodIn(
                TransactionStatus.PENDING,
                MANUAL_PAYMENT_METHODS,
                pageable
        );

        return pendingPage.map(TransactionLedgerResponse::fromEntity);
    }

    /**
     * UC051: Kế toán xác nhận giao dịch chuyển khoản thành công sau khi đối chiếu sao kê.
     *
     * @param transactionId    Mã giao dịch cần xác nhận.
     * @param accountantUserId ID tài khoản Kế toán viên thực hiện thao tác.
     * @param request          Dữ liệu xác nhận (mã bút toán, mã ngân hàng, ghi chú).
     * @return Chi tiết giao dịch sau khi cập nhật thành công.
     */
    @Transactional
    public TransactionDetailResponse confirmTransfer(
            Long transactionId,
            Long accountantUserId,
            ManualTransferConfirmRequest request
    ) {
        log.info("Kế toán ID: {} đang xác nhận giao dịch chuyển khoản #{}, mã bút toán: {}",
                accountantUserId, transactionId, request.getBankReferenceCode());

        // 1. Kiểm tra tính tồn tại của chứng từ giao dịch
        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException(
                        "Không tìm thấy giao dịch #" + transactionId,
                        HttpStatus.NOT_FOUND
                ));

        // 2. Chống xử lý trùng lặp (Idempotency): Nếu đã có mã gateway_id này trên giao dịch khác
        if (request.getBankReferenceCode() != null && !request.getBankReferenceCode().isBlank()) {
            String refCode = request.getBankReferenceCode().trim();
            transactionRepository.findByGatewayTransactionId(refCode)
                    .filter(existing -> !existing.getTransactionId().equals(transactionId))
                    .ifPresent(existing -> {
                        throw new AppException(
                                "Mã bút toán ngân hàng [" + refCode + "] đã được sử dụng cho giao dịch #" + existing.getTransactionId(),
                                HttpStatus.CONFLICT
                        );
                    });
        }

        // 3. Thực thi nghiệp vụ miền (Domain Logic): Chuyển trạng thái sang SUCCESS
        tx.confirmManualTransfer(accountantUserId, request.getBankReferenceCode(), request.getBankCode());
        Transaction savedTx = transactionRepository.save(tx);

        log.info("Giao dịch #{} đã được xác nhận SUCCESS bởi Kế toán ID: {}", savedTx.getTransactionId(), accountantUserId);

        // 4. Phát tán Sự kiện miền (Domain Event) qua Spring ApplicationEventPublisher
        // Giúp các module SV1 (Advertising) và SV3 (Reader) tự bắt sự kiện để mở quyền
        PaymentSuccessEvent event = PaymentSuccessEvent.builder()
                .transactionId(savedTx.getTransactionId())
                .userId(savedTx.getUserId())
                .transactionType(savedTx.getTransactionType().name())
                .targetId(savedTx.resolveTargetId())
                .amount(savedTx.getAmount())
                .currency(savedTx.getCurrency())
                .paymentMethod(savedTx.getPaymentMethod())
                .gatewayTransactionId(savedTx.getGatewayTransactionId())
                .paidAt(savedTx.getPaidAt())
                .build();

        eventPublisher.publishEvent(event);
        log.info("Đã phát tán sự kiện PaymentSuccessEvent cho giao dịch #{}, target: {}#{}",
                savedTx.getTransactionId(), savedTx.getTransactionType(), savedTx.resolveTargetId());

        return TransactionDetailResponse.fromEntity(savedTx);
    }

    /**
     * UC051: Kế toán từ chối đơn chuyển khoản do không nhận được tiền hoặc thông tin không hợp lệ.
     *
     * @param transactionId    Mã giao dịch cần từ chối.
     * @param accountantUserId ID tài khoản Kế toán viên từ chối.
     * @param request          Lý do từ chối.
     * @return Chi tiết giao dịch sau khi chuyển sang FAILED.
     */
    @Transactional
    public TransactionDetailResponse rejectTransfer(
            Long transactionId,
            Long accountantUserId,
            ManualTransferRejectRequest request
    ) {
        log.warn("Kế toán ID: {} từ chối giao dịch chuyển khoản #{}, lý do: {}",
                accountantUserId, transactionId, request.getRejectionReason());

        Transaction tx = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new AppException(
                        "Không tìm thấy giao dịch #" + transactionId,
                        HttpStatus.NOT_FOUND
                ));

        // Thực thi nghiệp vụ miền: Chuyển trạng thái sang FAILED
        tx.rejectManualTransfer(accountantUserId);
        Transaction savedTx = transactionRepository.save(tx);

        log.info("Giao dịch #{} đã chuyển sang FAILED bởi Kế toán ID: {}", savedTx.getTransactionId(), accountantUserId);

        return TransactionDetailResponse.fromEntity(savedTx);
    }
}
