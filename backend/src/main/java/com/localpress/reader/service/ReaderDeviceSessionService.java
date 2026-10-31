package com.localpress.reader.service;

import com.localpress.reader.dto.ReaderDeviceResponse;
import com.localpress.reader.repository.ReaderDeviceRepository;
import com.localpress.reader.repository.ReaderDeviceRepository.DeviceRow;
import com.localpress.shared.device.DeviceLimitReachedException;
import com.localpress.shared.device.DeviceSessionService;
import com.localpress.shared.device.RegisteredSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Base64;
import java.util.List;
import java.util.Set;

// UC043 ghi và thu hồi phiên. Login gọi register. Độc giả xem và thu hồi qua API reader.
@Service
public class ReaderDeviceSessionService implements DeviceSessionService {

    static final int ACTIVE_LIMIT = 2;
    static final String DEFAULT_NAME = "Trình duyệt";
    static final Set<String> DEVICE_TYPES = Set.of("DESKTOP", "MOBILE", "TABLET");

    private final ReaderDeviceRepository repository;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    @Autowired
    public ReaderDeviceSessionService(ReaderDeviceRepository repository) {
        this(repository, Clock.system(ZoneId.of("Asia/Ho_Chi_Minh")));
    }

    public ReaderDeviceSessionService(ReaderDeviceRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Override
    @Transactional
    public RegisteredSession register(long userId, String deviceName, String deviceType, String ipAddress, Instant expiresAt) {
        if (userId <= 0) {
            throw new IllegalArgumentException("Tài khoản không hợp lệ");
        }
        if (expiresAt == null) {
            throw new IllegalArgumentException("Thiếu thời điểm hết hạn phiên");
        }
        String name = normalizeName(deviceName);
        String type = normalizeType(deviceType);
        String ip = normalizeIp(ipAddress);
        if (!repository.lockUser(userId)) {
            throw new IllegalArgumentException("Không tìm thấy tài khoản");
        }
        Instant now = clock.instant();
        if (repository.countActive(userId, now) >= ACTIVE_LIMIT) {
            throw new DeviceLimitReachedException();
        }
        String sessionId = newSessionId();
        long deviceId = repository.insert(userId, name, type, sessionId, ip, expiresAt);
        return new RegisteredSession(deviceId, sessionId);
    }

    @Override
    public boolean isActive(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return false;
        }
        return repository.isActive(sessionId.trim(), clock.instant());
    }

    @Transactional(readOnly = true)
    public List<ReaderDeviceResponse> listMine(long userId, String currentSessionId) {
        String current = currentSessionId == null ? "" : currentSessionId.trim();
        return repository.listActive(userId, clock.instant()).stream()
                .map(row -> toResponse(row, current))
                .toList();
    }

    @Transactional
    public void revoke(long userId, long deviceId) {
        int updated = repository.revoke(userId, deviceId, clock.instant());
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phiên đăng nhập của bạn");
        }
    }

    private ReaderDeviceResponse toResponse(DeviceRow row, String currentSessionId) {
        boolean current = !currentSessionId.isEmpty() && currentSessionId.equals(row.deviceToken());
        return new ReaderDeviceResponse(
                row.deviceId(),
                row.deviceName(),
                row.deviceType(),
                row.ipAddress(),
                row.lastActiveAt(),
                row.createdAt(),
                current);
    }

    private String newSessionId() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String normalizeName(String deviceName) {
        String name = deviceName == null ? "" : deviceName.trim();
        if (name.isEmpty()) {
            return DEFAULT_NAME;
        }
        return name.length() > 150 ? name.substring(0, 150) : name;
    }

    private static String normalizeType(String deviceType) {
        String type = deviceType == null ? "" : deviceType.trim().toUpperCase();
        if (type.isEmpty()) {
            return "DESKTOP";
        }
        if (!DEVICE_TYPES.contains(type)) {
            throw new IllegalArgumentException("Loại thiết bị không hợp lệ");
        }
        return type;
    }

    private static String normalizeIp(String ipAddress) {
        if (ipAddress == null) {
            return null;
        }
        String ip = ipAddress.trim();
        if (ip.isEmpty()) {
            return null;
        }
        return ip.length() > 45 ? ip.substring(0, 45) : ip;
    }
}
