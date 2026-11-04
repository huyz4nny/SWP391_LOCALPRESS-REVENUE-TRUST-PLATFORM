package com.localpress.advertising;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

/**
 * Iter 3 của SV1: Dashboard (UC001, UC010, UC011), hủy/hoàn (UC013), thông báo (UC014), chứng từ (UC012).
 * Tách khỏi AdvertisingController để không đụng phần SV2 đang sửa. Mọi API lọc theo email đăng nhập.
 */
@RestController
@RequestMapping("/api/v1/advertiser")
public class AdPortalController {
    private final AdDashboardService dashboard;
    private final AdCancellationService cancellations;
    private final AdNotificationService notifications;

    public AdPortalController(AdDashboardService dashboard, AdCancellationService cancellations,
                              AdNotificationService notifications) {
        this.dashboard = dashboard;
        this.cancellations = cancellations;
        this.notifications = notifications;
    }

    public record CancelInput(@NotBlank @Size(max = 1000) String reason, boolean acknowledged) {}

    @GetMapping("/dashboard")
    public AdDashboardService.Dashboard dashboard(Authentication auth,
                                                  @RequestParam(required = false) LocalDate from,
                                                  @RequestParam(required = false) LocalDate to,
                                                  @RequestParam(required = false) Long campaignId) {
        return dashboard.dashboard(auth.getName(), from, to, campaignId);
    }

    @GetMapping("/performance")
    public List<AdDashboardService.DailyPerformance> performance(Authentication auth,
                                                                 @RequestParam(required = false) LocalDate from,
                                                                 @RequestParam(required = false) LocalDate to,
                                                                 @RequestParam(required = false) Long campaignId) {
        return dashboard.performance(auth.getName(), from, to, campaignId);
    }

    @GetMapping("/campaigns/{id}/acceptance")
    public AdDashboardService.AcceptanceReport acceptance(Authentication auth, @PathVariable long id) {
        return dashboard.acceptance(auth.getName(), id);
    }

    @GetMapping("/campaigns/{id}/cancellation-quote")
    public AdCancellationService.CancellationQuote quote(Authentication auth, @PathVariable long id) {
        return cancellations.quote(auth.getName(), id);
    }

    @PostMapping("/campaigns/{id}/cancel")
    public AdCancellationService.CancellationRequest cancel(Authentication auth, @PathVariable long id,
                                                            @Valid @RequestBody CancelInput input) {
        if (!input.acknowledged()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng xác nhận đã hiểu chính sách hủy");
        }
        return cancellations.cancel(auth.getName(), id, input.reason());
    }

    @GetMapping("/requests")
    public List<AdCancellationService.CancellationRequest> requests(Authentication auth) {
        return cancellations.myRequests(auth.getName());
    }

    @GetMapping("/documents")
    public List<AdDashboardService.CampaignSummary> documents(Authentication auth) {
        return dashboard.documents(auth.getName());
    }

    @GetMapping("/notifications")
    public AdNotificationService.NotificationPage notifications(Authentication auth,
                                                                @RequestParam(defaultValue = "0") int page,
                                                                @RequestParam(defaultValue = "20") int size) {
        return notifications.list(auth.getName(), page, size);
    }

    @GetMapping("/notifications/unread-count")
    public long unread(Authentication auth) {
        return notifications.unreadCount(auth.getName());
    }

    @PostMapping("/notifications/{id}/read")
    public void read(Authentication auth, @PathVariable long id) {
        notifications.markRead(auth.getName(), id);
    }

    @PostMapping("/notifications/read-all")
    public void readAll(Authentication auth) {
        notifications.markAllRead(auth.getName());
    }
}
