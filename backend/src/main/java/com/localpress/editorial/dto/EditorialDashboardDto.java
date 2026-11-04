package com.localpress.editorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * DTO tổng quan bảng điều khiển vận hành tòa soạn (Màn II.2.10 - UC015, UC028).
 * Tích hợp Hybrid Revenue B2B + B2C, Ad Slot Occupancy Rate, và Urgent Action Queue.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EditorialDashboardDto {

    // 1. Hybrid Revenue (Doanh thu kép B2B + B2C)
    private BigDecimal b2bTotalSigned;      // Tổng giá trị hợp đồng B2B đã chốt
    private BigDecimal b2bActualPaid;        // Doanh số B2B thực thu
    private BigDecimal b2bReceivables;       // Khoản phải thu B2B còn chờ
    private BigDecimal b2cSubscriptions;     // Doanh thu B2C gói thuê bao VIP
    private BigDecimal b2cSingleArticles;    // Doanh thu B2C bán lẻ bài viết Paywall
    private BigDecimal totalPlatformRevenue; // Tổng doanh thu toàn nền tảng (B2B thực thu + B2C Subscriptions + B2C Articles)

    // 2. Inventory Occupancy (Tỷ lệ lấp đầy kho quảng cáo)
    @Builder.Default
    private List<SlotOccupancyDto> slotOccupancies = new ArrayList<>();

    // 3. Urgent Action Queue (Hàng đợi công việc khẩn cấp)
    private long pendingArticlesCount;   // Bài viết chờ duyệt (IN_REVIEW)
    private long pendingBookingsCount;   // Yêu cầu booking chờ báo giá (PENDING)
    private long pendingCreativesCount;  // Banner quảng cáo chờ duyệt (PENDING)
    private long pendingCommentsCount;   // Bình luận chờ duyệt (PENDING)

    @Builder.Default
    private List<UrgentItemDto> urgentItems = new ArrayList<>();
}
