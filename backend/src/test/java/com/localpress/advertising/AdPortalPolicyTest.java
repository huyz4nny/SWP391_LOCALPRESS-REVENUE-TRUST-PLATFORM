package com.localpress.advertising;

import com.localpress.finance.dto.response.OrderStatusResponse;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class AdPortalPolicyTest {
    private Map<String,Object> campaign(LocalDate start,LocalDate end) {
        var c=new HashMap<String,Object>();
        c.put("start_date",java.sql.Date.valueOf(start)); c.put("end_date",java.sql.Date.valueOf(end));
        c.put("status","APPROVED"); c.put("payment_status","PAID"); c.put("quotation_status","ACCEPTED");
        c.put("slot_status","ACTIVE"); c.put("contract_reference","HD1"); c.put("approved_creative_id",1L);
        return c;
    }
    @Test void refundCountsTodayAsUsedAndRoundsDown() {
        var today=LocalDate.of(2026,11,3);
        var c=campaign(today.minusDays(2),today.plusDays(7));
        var order=OrderStatusResponse.builder().isPaid(true).amount(BigDecimal.valueOf(1000001)).build();
        var q=AdCancellationService.calculate(c,today,order);
        assertEquals(10,q.totalDays()); assertEquals(7,q.unusedDays());
        assertEquals(new BigDecimal("700000"),q.proposedAmount());
        assertTrue(q.refundApplicable());
        c.put("end_date",java.sql.Date.valueOf(today));
        assertFalse(AdCancellationService.calculate(c,today,order).refundApplicable());
        c.put("status","CANCELLED");
        assertFalse(AdCancellationService.calculate(c,today,order).allowed());
    }
    @Test void notYetActivatedIsNotPaused() {
        var today=LocalDate.of(2026,11,3); var c=campaign(today,today.plusDays(2));
        c.put("status","PENDING");
        assertEquals("AWAITING_ACTIVATION",CampaignStage.derive(c,today).stage());
        c.put("status","APPROVED"); c.put("slot_status","INACTIVE");
        assertEquals("AWAITING_ACTIVATION",CampaignStage.derive(c,today).stage());
        c.put("status","SUSPENDED");
        assertEquals("PAUSED",CampaignStage.derive(c,today).stage());
    }
    @Test void scanGateAndAcceptanceAreIndependentOfDisplayedStatus() {
        var today=LocalDate.of(2026,11,3); var c=campaign(today,today.plusDays(2));
        assertEquals("RUNNING",CampaignStage.derive(c,today).stage());
        c.put("scan_status","CHANGED");
        assertEquals("AWAITING_CREATIVE",CampaignStage.derive(c,today).stage());
        c.put("status","CANCELLED");
        assertEquals("CANCELLED",CampaignStage.derive(c,today).stage());
        assertFalse(AdDashboardService.acceptanceReason(c,today,100).isEmpty());
        assertEquals(new BigDecimal("3.00"),AdDashboardService.ctr(400,12));
        assertEquals(BigDecimal.ZERO,AdDashboardService.ctr(0,0));
    }
}
