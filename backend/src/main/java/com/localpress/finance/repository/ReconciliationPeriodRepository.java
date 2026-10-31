package com.localpress.finance.repository;

import com.localpress.finance.model.ReconciliationPeriod;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReconciliationPeriodRepository extends JpaRepository<ReconciliationPeriod, Long> {

    Optional<ReconciliationPeriod> findByPeriodMonth(String periodMonth);

    /** Khóa dòng kỳ: chốt kỳ và xử lý khoản lệch cùng lúc thì chạy lần lượt. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ReconciliationPeriod p WHERE p.periodMonth = :month")
    Optional<ReconciliationPeriod> findByPeriodMonthForUpdate(@Param("month") String month);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ReconciliationPeriod p WHERE p.periodId = :id")
    Optional<ReconciliationPeriod> findByIdForUpdate(@Param("id") Long id);

    List<ReconciliationPeriod> findTop12ByOrderByPeriodMonthDesc();
}
