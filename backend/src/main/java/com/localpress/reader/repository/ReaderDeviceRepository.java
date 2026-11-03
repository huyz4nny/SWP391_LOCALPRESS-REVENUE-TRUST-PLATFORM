package com.localpress.reader.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

// đọc và ghi user_devices cho UC043
@Repository
@RequiredArgsConstructor
public class ReaderDeviceRepository {

    private final JdbcTemplate jdbcTemplate;

    public record DeviceRow(
            long deviceId,
            String deviceName,
            String deviceType,
            String ipAddress,
            LocalDateTime lastActiveAt,
            LocalDateTime createdAt,
            String deviceToken
    ) {
    }

    // khóa dòng user để hai lần đăng nhập cùng lúc không cùng đếm thấy dưới 2 phiên
    public boolean lockUser(long userId) {
        List<Long> ids = jdbcTemplate.query(
                "SELECT user_id FROM users WHERE user_id = ? FOR UPDATE",
                (rs, row) -> rs.getLong(1),
                userId);
        return !ids.isEmpty();
    }

    public int countActive(long userId, Instant now) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM user_devices
                WHERE user_id = ? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)
                """, Integer.class, userId, Timestamp.from(now));
        return count == null ? 0 : count;
    }

    public long insert(long userId, String deviceName, String deviceType, String deviceToken,
                       String ipAddress, Instant expiresAt) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO user_devices (user_id, device_name, device_type, device_token, ip_address, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, userId);
            statement.setString(2, deviceName);
            statement.setString(3, deviceType);
            statement.setString(4, deviceToken);
            if (ipAddress == null) {
                statement.setNull(5, Types.VARCHAR);
            } else {
                statement.setString(5, ipAddress);
            }
            statement.setTimestamp(6, Timestamp.from(expiresAt));
            return statement;
        }, keyHolder);
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("Không lấy được id phiên vừa tạo");
        }
        return key.longValue();
    }

    public boolean isActive(String sessionId, Instant now) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM user_devices
                WHERE device_token = ? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)
                """, Integer.class, sessionId, Timestamp.from(now));
        return count != null && count > 0;
    }

    public List<DeviceRow> listActive(long userId, Instant now) {
        return jdbcTemplate.query("""
                SELECT device_id, device_name, device_type, ip_address, last_active_at, created_at, device_token
                FROM user_devices
                WHERE user_id = ? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)
                ORDER BY created_at DESC, device_id DESC
                """, (rs, row) -> new DeviceRow(
                rs.getLong("device_id"),
                rs.getString("device_name"),
                rs.getString("device_type"),
                rs.getString("ip_address"),
                toLocal(rs.getTimestamp("last_active_at")),
                toLocal(rs.getTimestamp("created_at")),
                rs.getString("device_token")), userId, Timestamp.from(now));
    }

    public int revoke(long userId, long deviceId, Instant now) {
        return jdbcTemplate.update("""
                UPDATE user_devices
                SET revoked_at = ?
                WHERE device_id = ? AND user_id = ? AND revoked_at IS NULL
                """, Timestamp.from(now), deviceId, userId);
    }

    private static LocalDateTime toLocal(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }
}
