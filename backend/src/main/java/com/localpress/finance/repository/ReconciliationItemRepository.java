package com.localpress.finance.repository;

import com.localpress.finance.model.ReconciliationItem;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReconciliationItemRepository extends JpaRepository<ReconciliationItem, Long> {

    List<ReconciliationItem> findByPeriodIdOrderByCreatedAtAsc(Long periodId);

    long countByStatus(ReconciliationItem.Status status);

    /** Mã GD đã được ghi tiền qua đối soát chưa (chặn khiếu nại ghi nhận lần 2). */
    boolean existsByReferenceCodeAndStatusAndActionIn(String referenceCode, ReconciliationItem.Status status,
                                                      Collection<ReconciliationItem.Action> actions);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM ReconciliationItem i WHERE i.itemId = :id")
    Optional<ReconciliationItem> findByIdForUpdate(@Param("id") Long id);
}
