package com.localpress.finance.repository;

import com.localpress.finance.model.PaymentComplaint;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentComplaintRepository extends JpaRepository<PaymentComplaint, Long> {

    List<PaymentComplaint> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<PaymentComplaint> findByStatusOrderByCreatedAtAsc(PaymentComplaint.Status status);

    List<PaymentComplaint> findAllByOrderByCreatedAtDesc();

    boolean existsByBankReference(String bankReference);

    /** Webhook về sau: mã GD này đã được kế toán ghi nhận qua khiếu nại chưa (chặn ghi nhận lần 2). */
    Optional<PaymentComplaint> findByBankReferenceAndStatus(String bankReference, PaymentComplaint.Status status);

    long countByStatus(PaymentComplaint.Status status);

    /** Khóa dòng khiếu nại: 2 kế toán bấm xử lý cùng lúc thì người sau nhận 409. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM PaymentComplaint c WHERE c.complaintId = :id")
    Optional<PaymentComplaint> findByIdForUpdate(@Param("id") Long id);
}
