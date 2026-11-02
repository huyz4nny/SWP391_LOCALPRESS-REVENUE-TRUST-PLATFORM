package com.localpress.reader.service;

import com.localpress.reader.dto.ReaderSubscriptionResponse;
import com.localpress.reader.repository.ReaderSubscriptionRepository;
import com.localpress.reader.repository.ReaderSubscriptionRepository.SubscriptionRow;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

// UC044 xem gói đang dùng và tắt gia hạn kỳ sau
// quyền đọc không bị cắt: status và end_date giữ nguyên
@Service
public class ReaderSubscriptionService {

    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");

    private final ReaderSubscriptionRepository repository;
    private final Clock clock;

    @Autowired
    public ReaderSubscriptionService(ReaderSubscriptionRepository repository) {
        this(repository, Clock.system(VIETNAM));
    }

    public ReaderSubscriptionService(ReaderSubscriptionRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    public List<ReaderSubscriptionResponse> listMine(Long userId) {
        LocalDate today = LocalDate.now(clock);
        return repository.findActiveNotExpired(userId, today).stream()
                .map(row -> toResponse(row, today))
                .toList();
    }

    // gọi lại khi đã tắt thì vẫn thành công, không đổi gì thêm
    @Transactional
    public ReaderSubscriptionResponse cancelAutoRenew(Long userId, Long subscriptionId) {
        SubscriptionRow row = repository.findOwned(userId, subscriptionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy gói của bạn"));
        if (!"ACTIVE".equals(row.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chỉ tắt gia hạn trên gói đang hoạt động");
        }
        if (row.autoRenew()) {
            int updated = repository.disableAutoRenew(subscriptionId, userId);
            if (updated == 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Không tắt được gia hạn. Tải lại trang rồi thử lại");
            }
        }
        return toResponse(copyWithAutoRenew(row, false), LocalDate.now(clock));
    }

    private static ReaderSubscriptionResponse toResponse(SubscriptionRow row, LocalDate today) {
        boolean inEffect = row.startDate() != null
                && row.endDate() != null
                && !today.isBefore(row.startDate())
                && !today.isAfter(row.endDate());
        return new ReaderSubscriptionResponse(
                row.subscriptionId(),
                row.planId(),
                row.planName(),
                row.price(),
                row.accessScope(),
                row.categoryId(),
                row.categoryName(),
                row.startDate(),
                row.endDate(),
                row.autoRenew(),
                row.hasAdFree(),
                row.hasAudio(),
                inEffect);
    }

    private static SubscriptionRow copyWithAutoRenew(SubscriptionRow row, boolean autoRenew) {
        return new SubscriptionRow(
                row.subscriptionId(),
                row.planId(),
                row.planName(),
                row.price(),
                row.accessScope(),
                row.categoryId(),
                row.categoryName(),
                row.startDate(),
                row.endDate(),
                row.status(),
                autoRenew,
                row.hasAdFree(),
                row.hasAudio());
    }
}
