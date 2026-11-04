package com.localpress.administration.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.administration.repository.AdSlotConfigRepository;
import com.localpress.administration.repository.AdSlotConfigRepository.Slot;
import com.localpress.administration.repository.AdSlotConfigRepository.Reservation;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdSlotConfigService {
    private final AdminAccess access;
    private final AdSlotConfigRepository repository;
    private final ObjectMapper json;
    public record Input(@NotBlank @Size(max=150) String name,
                        @NotNull @DecimalMin("0") @Digits(integer=10, fraction=2) BigDecimal basePrice,
                        @NotNull @Min(1) Integer capacity,
                        @NotNull @Pattern(regexp="ACTIVE|INACTIVE") String status,
                        @NotNull @Pattern(regexp="[a-f0-9]{64}") String expectedRevision) {}
    public record View(String id, String code, String name, String pageLocation, String deviceType,
                       String dimensions, int capacity, String inventoryMode, BigDecimal basePrice,
                       String pricingType, String status, String categoryName, String revision) {}

    public List<View> list(Authentication auth) {
        access.requireAdmin(auth);
        return repository.list().stream().map(this::view).toList();
    }

    @Transactional
    public View update(Authentication auth, long id, Input input, String ip) {
        var actor = access.requireAdmin(auth);
        Slot old = repository.lock(id).orElseThrow(() -> failure(HttpStatus.NOT_FOUND, "Không tìm thấy vị trí quảng cáo."));
        if (!revision(old).equals(input.expectedRevision())) {
            throw failure(HttpStatus.CONFLICT, "Cấu hình đã thay đổi. Hãy tải lại danh sách và kiểm tra trước khi lưu.");
        }
        if ("EXCLUSIVE".equals(old.inventoryMode()) && input.capacity() != 1) {
            throw failure(HttpStatus.BAD_REQUEST, "Vị trí độc quyền phải có sức chứa bằng 1.");
        }
        if (input.capacity() < old.capacity() || ("ACTIVE".equals(old.status()) && "INACTIVE".equals(input.status()))) {
            var today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
            var reservations = repository.reservations(id, today);
            if ("INACTIVE".equals(input.status()) && !reservations.isEmpty()) {
                throw failure(HttpStatus.CONFLICT, "Không thể tắt vị trí còn booking hiệu lực hiện tại hoặc tương lai. Hãy xử lý booking trước.");
            }
            if (input.capacity() < peak(reservations, today)) {
                throw failure(HttpStatus.CONFLICT, "Sức chứa mới thấp hơn số booking đã giữ chỗ trong cùng một ngày.");
            }
        }
        Slot updated = new Slot(old.id(), old.code(), input.name().strip(), old.pageLocation(), old.deviceType(),
                old.dimensions(), input.capacity(), old.inventoryMode(), input.basePrice().setScale(2),
                old.pricingType(), input.status(), old.categoryName());
        if (!revision(old).equals(revision(updated))) {
            repository.update(id, updated.name(), updated.basePrice(), updated.capacity(), updated.status());
            repository.audit(actor.getId(), id, serialize(old), serialize(updated), ip);
        }
        return view(updated);
    }

    // Inclusive end dates: one reservation frees capacity only on the following day.
    public static int peak(List<Reservation> reservations, LocalDate today) {
        TreeMap<LocalDate, Integer> changes = new TreeMap<>();
        for (var r : reservations) {
            if (r.end().isBefore(today)) continue;
            changes.merge(r.start().isBefore(today) ? today : r.start(), 1, Integer::sum);
            changes.merge(r.end().plusDays(1), -1, Integer::sum);
        }
        int current = 0, peak = 0;
        for (int change : changes.values()) { current += change; peak = Math.max(peak, current); }
        return peak;
    }
    private View view(Slot s) {
        return new View(Long.toString(s.id()), s.code(), s.name(), s.pageLocation(), s.deviceType(), s.dimensions(),
                s.capacity(), s.inventoryMode(), s.basePrice(), s.pricingType(), s.status(), s.categoryName(), revision(s));
    }
    private String revision(Slot s) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(serialize(s).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    private String serialize(Slot s) {
        try { return json.writeValueAsString(s); }
        catch (JsonProcessingException e) { throw new IllegalStateException(e); }
    }
    private ResponseStatusException failure(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }
}
