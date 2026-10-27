package com.localpress.advertising;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * UC008: nộp banner và xem trước. Banner mới luôn chờ tòa soạn duyệt (review_status PENDING);
 * bản APPROVED trước đó vẫn chạy tới khi bản mới được duyệt (Rule 8).
 */
@Service
public class AdCreativeService {
    static final String FILE_PATH = "/api/v1/ad-slots/creative-files/";
    private static final Pattern FILE_NAME = Pattern.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.png");
    private static final Pattern DIMENSIONS = Pattern.compile("(\\d+)\\s*x\\s*(\\d+)");

    private final JdbcTemplate jdbc;
    private final AdBookingService bookings;
    private final TransactionTemplate transaction;
    private final Path directory;
    private final long maxBytes;

    public AdCreativeService(JdbcTemplate jdbc, AdBookingService bookings, PlatformTransactionManager txManager,
                             @Value("${localpress.storage.creative-directory:uploads/creatives}") String directory,
                             // ponytail: chưa có đặc tả dung lượng banner; chỉnh cấu hình khi SV1/SV5 chốt giới hạn.
                             @Value("${localpress.advertising.creative.max-bytes:2097152}") long maxBytes) {
        this.jdbc = jdbc;
        this.bookings = bookings;
        this.transaction = new TransactionTemplate(txManager);
        this.directory = Path.of(directory).toAbsolutePath().normalize();
        this.maxBytes = maxBytes;
    }

    public record Creative(String id, String campaignId, int versionNumber, String title, String imageUrl,
                           String targetUrl, Integer width, Integer height, Integer fileSizeKb, String status,
                           String reviewNotes, LocalDateTime uploadedAt, LocalDateTime reviewedAt,
                           boolean isActiveServing) {}

    public record DailyStat(LocalDate date, long impressions, long clicks, BigDecimal ctr) {}

    public record Campaign(String id, String bookingId, String advertiserId, String companyName, String slotId,
                           String slotName, String slotDimensions, String name, LocalDate startDate, LocalDate endDate,
                           BigDecimal totalBudget, String status, Integer activeCreativeVersion,
                           List<Creative> creatives, long impressions, long clicks, BigDecimal ctr,
                           List<DailyStat> dailyStats, LocalDateTime createdAt, LocalDateTime updatedAt) {}

    private record Target(long campaignId, String quotationStatus, String status, String dimensions) {}

    public Campaign campaign(String email, long id) {
        bookings.owned(bookings.advertiser(email), id, false);
        List<Creative> creatives = creatives(id);
        Integer active = creatives.stream().filter(Creative::isActiveServing).map(Creative::versionNumber)
                .findFirst().orElse(null);
        long[] totals = jdbc.queryForObject("SELECT COALESCE(SUM(impressions), 0), COALESCE(SUM(clicks), 0) " +
                "FROM ad_stats WHERE campaign_id = ?", (rs, r) -> new long[]{rs.getLong(1), rs.getLong(2)}, id);
        // Iter 2 chỉ hiện tổng; CTR = clicks / impressions * 100, chuẩn công thức chung chờ SV4/SV5 chốt (Rule 16).
        BigDecimal ctr = totals[0] == 0 ? BigDecimal.ZERO
                : BigDecimal.valueOf(totals[1] * 100).divide(BigDecimal.valueOf(totals[0]), 2, RoundingMode.HALF_UP);
        return jdbc.query("SELECT c.*, s.name AS slot_name, s.dimensions, a.company_name FROM ad_campaigns c " +
                        "JOIN ad_slots s ON s.slot_id = c.slot_id JOIN advertisers a ON a.advertiser_id = c.advertiser_id " +
                        "WHERE c.campaign_id = ?",
                (rs, r) -> new Campaign(String.valueOf(id), String.valueOf(id), rs.getString("advertiser_id"),
                        rs.getString("company_name"), rs.getString("slot_id"), rs.getString("slot_name"),
                        rs.getString("dimensions"), rs.getString("campaign_name"),
                        rs.getDate("start_date").toLocalDate(), rs.getDate("end_date").toLocalDate(),
                        rs.getBigDecimal("accepted_amount") != null ? rs.getBigDecimal("accepted_amount") : rs.getBigDecimal("quoted_amount"),
                        campaignStatus(rs.getString("status")), active, creatives, totals[0], totals[1], ctr, List.of(),
                        AdBookingService.time(rs, "created_at"), AdBookingService.time(rs, "updated_at")), id).get(0);
    }

    private static String campaignStatus(String status) {
        return switch (status) {
            case "PENDING" -> "PENDING_APPROVAL";
            case "SUSPENDED" -> "PAUSED";
            case "REJECTED" -> "CANCELLED";
            default -> status;
        };
    }

    private List<Creative> creatives(long campaignId) {
        Integer serving = jdbc.query("SELECT MAX(version_number) FROM ad_creatives WHERE campaign_id = ? AND review_status = 'APPROVED'",
                (rs, r) -> {
                    int v = rs.getInt(1);
                    return rs.wasNull() ? null : v;
                }, campaignId).get(0);
        return jdbc.query("SELECT * FROM ad_creatives WHERE campaign_id = ? ORDER BY version_number DESC",
                (rs, r) -> {
                    int version = rs.getInt("version_number");
                    long bytes = rs.getLong("file_size_bytes");
                    Integer kb = rs.wasNull() ? null : (int) Math.ceil(bytes / 1024.0);
                    int width = rs.getInt("width");
                    Integer w = rs.wasNull() ? null : width;
                    int height = rs.getInt("height");
                    Integer h = rs.wasNull() ? null : height;
                    return new Creative(rs.getString("creative_id"), String.valueOf(campaignId), version,
                            rs.getString("title") != null ? rs.getString("title") : "Banner v" + version,
                            publicUrl(rs.getString("media_url")), rs.getString("target_url"), w, h, kb,
                            creativeStatus(rs.getString("review_status")), rs.getString("rejection_reason"),
                            AdBookingService.time(rs, "uploaded_at"), AdBookingService.time(rs, "approved_at"),
                            serving != null && serving == version);
                }, campaignId);
    }

    /** DB: PENDING/APPROVED/REJECTED/BLOCKED -> DTO frontend: IN_REVIEW/APPROVED/REJECTED. */
    private static String creativeStatus(String reviewStatus) {
        return switch (reviewStatus) {
            case "PENDING" -> "IN_REVIEW";
            case "BLOCKED" -> "REJECTED";
            default -> reviewStatus;
        };
    }

    private static String publicUrl(String mediaUrl) {
        if (mediaUrl == null || !mediaUrl.startsWith("/")) return mediaUrl;
        return ServletUriComponentsBuilder.fromCurrentContextPath().path(mediaUrl).toUriString();
    }

    public Creative upload(String email, long campaignId, MultipartFile file, String title, String targetUrl) {
        AdBookingService.Advertiser me = bookings.advertiser(email);
        bookings.owned(me, campaignId, false);
        Target target = target(campaignId, false);
        checkCanSubmit(target);
        if (title == null || title.isBlank() || title.length() > 255) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tiêu đề banner bắt buộc, tối đa 255 ký tự");
        }
        String url = safeTargetUrl(targetUrl);
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng chọn file ảnh banner");
        }
        if (file.getSize() > maxBytes) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "Ảnh banner tối đa " + (maxBytes / 1024) + " KB");
        }
        BufferedImage image = readImage(file);
        Matcher size = DIMENSIONS.matcher(target.dimensions() == null ? "" : target.dimensions());
        if (size.matches() && (image.getWidth() != Integer.parseInt(size.group(1))
                || image.getHeight() != Integer.parseInt(size.group(2)))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ảnh phải đúng kích thước vị trí " + target.dimensions()
                    + " px, file đang là " + image.getWidth() + "x" + image.getHeight() + " px");
        }

        // Ghi file trước, ngoài transaction DB (SDS ADV-5); ghi metadata thất bại thì xóa file mồ côi.
        String filename = store(image);
        try {
            long creativeId = transaction.execute(status -> {
                checkCanSubmit(target(campaignId, true));
                int version = jdbc.queryForObject("SELECT COALESCE(MAX(version_number), 0) + 1 FROM ad_creatives WHERE campaign_id = ?",
                        Integer.class, campaignId);
                jdbc.update("INSERT INTO ad_creatives (campaign_id, uploaded_by, version_number, title, media_url, target_url, " +
                                "width, height, file_size_bytes, review_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')",
                        campaignId, me.userId(), version, title.trim(), FILE_PATH + filename, url,
                        image.getWidth(), image.getHeight(), file.getSize());
                long id = jdbc.queryForObject("SELECT creative_id FROM ad_creatives WHERE campaign_id = ? AND version_number = ?",
                        Long.class, campaignId, version);
                bookings.audit(me.userId(), "AD_CREATIVE_SUBMITTED", campaignId,
                        Map.of("creativeId", id, "version", version, "targetUrl", url));
                return id;
            });
            return creatives(campaignId).stream().filter(c -> c.id().equals(String.valueOf(creativeId))).findFirst().orElseThrow();
        } catch (RuntimeException e) {
            try {
                Files.deleteIfExists(directory.resolve(filename));
            } catch (IOException cleanup) {
                e.addSuppressed(cleanup);
            }
            throw e;
        }
    }

    private Target target(long campaignId, boolean lock) {
        return jdbc.query("SELECT c.campaign_id, c.quotation_status, c.status, s.dimensions FROM ad_campaigns c " +
                        "JOIN ad_slots s ON s.slot_id = c.slot_id WHERE c.campaign_id = ?" + (lock ? " FOR UPDATE" : ""),
                (rs, r) -> new Target(rs.getLong(1), rs.getString(2), rs.getString(3), rs.getString(4)), campaignId).get(0);
    }

    private static void checkCanSubmit(Target target) {
        if (!"ACCEPTED".equals(target.quotationStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Vui lòng xác nhận báo giá trước khi nộp banner");
        }
        if ("REJECTED".equals(target.status()) || "COMPLETED".equals(target.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chiến dịch đã đóng, không nhận banner mới");
        }
    }

    static String safeTargetUrl(String value) {
        try {
            URI uri = new URI(value == null ? "" : value.trim());
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
            if ((!scheme.equals("http") && !scheme.equals("https")) || uri.getHost() == null || uri.getHost().isBlank()
                    || uri.toString().length() > 2048) {
                throw new IllegalArgumentException();
            }
            return uri.toString();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "URL đích phải là địa chỉ http:// hoặc https:// hợp lệ");
        }
    }

    private static BufferedImage readImage(MultipartFile file) {
        try (InputStream input = file.getInputStream(); ImageInputStream stream = ImageIO.createImageInputStream(input)) {
            Iterator<ImageReader> readers = stream == null ? null : ImageIO.getImageReaders(stream);
            if (readers == null || !readers.hasNext()) {
                throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Banner chỉ nhận ảnh JPEG hoặc PNG");
            }
            ImageReader reader = readers.next();
            try {
                String format = reader.getFormatName();
                if (!format.equalsIgnoreCase("JPEG") && !format.equalsIgnoreCase("PNG")) {
                    throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Banner chỉ nhận ảnh JPEG hoặc PNG");
                }
                reader.setInput(stream, true, true);
                // Đọc kích thước từ header trước khi giải mã để file nhỏ nhưng pixel khổng lồ không làm tràn bộ nhớ.
                if (reader.getWidth(0) > 4096 || reader.getHeight(0) > 4096) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kích thước ảnh vượt quá giới hạn xử lý");
                }
                return reader.read(0);
            } finally {
                reader.dispose();
            }
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File ảnh bị lỗi hoặc không đọc được", e);
        }
    }

    /** Ghi lại thành PNG mới: bỏ metadata và nội dung lạ nhúng trong file gốc. */
    private String store(BufferedImage image) {
        String filename = UUID.randomUUID() + ".png";
        Path target = directory.resolve(filename);
        try {
            Files.createDirectories(directory);
            try (OutputStream output = Files.newOutputStream(target, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE)) {
                if (!ImageIO.write(image, "png", output)) throw new IOException("Không có bộ ghi PNG");
            }
            return filename;
        } catch (IOException e) {
            try {
                Files.deleteIfExists(target);
            } catch (IOException cleanup) {
                e.addSuppressed(cleanup);
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Không lưu được ảnh banner", e);
        }
    }

    public Resource load(String filename) {
        if (filename == null || !FILE_NAME.matcher(filename).matches()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ảnh");
        }
        Path file = directory.resolve(filename).normalize();
        if (!file.startsWith(directory) || !Files.isRegularFile(file)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy ảnh");
        }
        return new FileSystemResource(file);
    }
}
