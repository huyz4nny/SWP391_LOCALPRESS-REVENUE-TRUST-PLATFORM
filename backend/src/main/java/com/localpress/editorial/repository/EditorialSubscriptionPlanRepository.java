package com.localpress.editorial.repository;

import com.localpress.editorial.entity.EditorialSubscriptionPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository thao tác bảng 'subscription_plans' phục vụ UC028 (Quản lý gói đọc).
 */
@Repository
public interface EditorialSubscriptionPlanRepository extends JpaRepository<EditorialSubscriptionPlan, Long> {

    List<EditorialSubscriptionPlan> findAllByOrderByPriceAsc();

    List<EditorialSubscriptionPlan> findByStatusOrderByPriceAsc(EditorialSubscriptionPlan.PlanStatus status);

    boolean existsByName(String name);

    boolean existsByNameAndPlanIdNot(String name, Long planId);
}
