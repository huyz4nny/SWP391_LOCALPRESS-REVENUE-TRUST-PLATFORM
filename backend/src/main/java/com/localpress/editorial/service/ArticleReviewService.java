package com.localpress.editorial.service;

import com.localpress.editorial.dto.EditorialArticleDto;
import com.localpress.editorial.dto.UpdateArticleStatusRequest;
import com.localpress.editorial.entity.EditorialArticle;
import com.localpress.editorial.entity.EditorialArticleVersion;
import com.localpress.editorial.repository.EditorialArticleRepository;
import com.localpress.editorial.repository.EditorialArticleVersionRepository;
import com.localpress.shared.exception.AppException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service xử lý nghiệp vụ Màn hình 1 của SV2 (Trọng Phan):
 * Article Review and Publishing (UC025).
 *
 * Tuân thủ nghiêm ngặt:
 * - Quy tắc 8: Phiên bản hóa bài viết (article_versions).
 * - Ràng buộc toàn vẹn CSDL: chk_articles_price và chk_articles_published_version.
 * - Lưu vết kiểm toán vào bảng audit_logs.
 */
@Service
@RequiredArgsConstructor
public class ArticleReviewService {

    /**
     * ID mặc định của Biên tập viên SV2 trong seed_data.sql (Nguyễn Văn Biên Tập - user_id = 3)
     */
    private static final Long DEFAULT_EDITOR_USER_ID = 3L;

    private final EditorialArticleRepository articleRepository;
    private final EditorialArticleVersionRepository versionRepository;

    /**
     * Lấy danh sách toàn bộ bài viết trong tòa soạn kèm phiên bản mới nhất và lịch sử phiên bản.
     */
    @Transactional(readOnly = true)
    public List<EditorialArticleDto> getAllArticles() {
        List<EditorialArticle> articles = articleRepository.findAllByOrderByUpdatedAtDesc();
        return articles.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    /**
     * Lấy chi tiết 1 bài viết theo ID để xem toàn văn bản thảo và lịch sử phiên bản.
     */
    @Transactional(readOnly = true)
    public EditorialArticleDto getArticleById(Long articleId) {
        EditorialArticle article = articleRepository.findById(articleId)
                .orElseThrow(() -> new AppException("Không tìm thấy bài viết với ID: " + articleId, HttpStatus.NOT_FOUND));
        return mapToDto(article);
    }

    /**
     * Duyệt bài / Yêu cầu sửa / Xuất bản / Gỡ bài (UC025).
     *
     * Input:
     * - articleId: ID bài viết cần chuyển trạng thái
     * - request: chứa status đích (APPROVED, CHANGES_REQUESTED/REJECTED, PUBLISHED, UNPUBLISHED/TAKEN_DOWN)
     *            và reviewNotes (nhận xét của biên tập viên SV2).
     */
    @Transactional
    public EditorialArticleDto updateArticleStatus(Long articleId, UpdateArticleStatusRequest request) {
        EditorialArticle article = articleRepository.findById(articleId)
                .orElseThrow(() -> new AppException("Không tìm thấy bài viết với ID: " + articleId, HttpStatus.NOT_FOUND));

        String oldStatus = article.getStatus();
        String targetStatus = request.getStatus() != null ? request.getStatus().trim().toUpperCase() : "";
        String notes = request.getReviewNotes() != null ? request.getReviewNotes().trim() : "";

        // Lấy phiên bản mới nhất (latest_version) của bài viết để cập nhật kết quả duyệt
        Optional<EditorialArticleVersion> latestVersionOpt = versionRepository
                .findByArticleIdAndVersionNumber(article.getArticleId(), article.getLatestVersion());

        EditorialArticleVersion latestVersion = latestVersionOpt.orElseGet(() -> {
            List<EditorialArticleVersion> allVersions = versionRepository
                    .findByArticleIdOrderByVersionNumberDesc(article.getArticleId());
            if (allVersions.isEmpty()) {
                throw new AppException("Bài viết chưa có phiên bản nội dung nào trong article_versions", HttpStatus.BAD_REQUEST);
            }
            return allVersions.get(0);
        });

        LocalDateTime now = LocalDateTime.now();

        switch (targetStatus) {
            case "IN_REVIEW":
            case "PENDING":
                // Phóng viên gửi bài chờ biên tập viên duyệt
                latestVersion.setReviewStatus("PENDING");
                latestVersion.setSubmittedAt(now);
                if (!"PUBLISHED".equals(article.getStatus())) {
                    article.setStatus("PENDING");
                }
                break;

            case "APPROVED":
                // Bước 1 của SV2: Duyệt nội dung phiên bản mới nhất (chờ bấm Xuất bản)
                latestVersion.setReviewStatus("APPROVED");
                latestVersion.setReviewedBy(DEFAULT_EDITOR_USER_ID);
                latestVersion.setReviewedAt(now);
                if (!notes.isEmpty()) {
                    latestVersion.setReviewFeedback(notes);
                }
                if (!"PUBLISHED".equals(article.getStatus())) {
                    article.setStatus("PENDING");
                }
                break;

            case "CHANGES_REQUESTED":
            case "REJECTED":
                // SV2 trả bài yêu cầu phóng viên sửa lại
                if (notes.isEmpty()) {
                    throw new AppException("Vui lòng nhập ghi chú hướng dẫn sửa bài khi từ chối/yêu cầu chỉnh sửa", HttpStatus.BAD_REQUEST);
                }
                latestVersion.setReviewStatus("REJECTED");
                latestVersion.setReviewedBy(DEFAULT_EDITOR_USER_ID);
                latestVersion.setReviewedAt(now);
                latestVersion.setReviewFeedback(notes);

                // Quy tắc 8: Nếu bài viết chưa từng xuất bản thì chuyển sang REJECTED;
                // nếu đã có bản cũ đang PUBLISHED thì giữ nguyên bản cũ trên trang báo.
                if (article.getPublishedVersion() == null || !"PUBLISHED".equals(article.getStatus())) {
                    article.setStatus("REJECTED");
                }
                break;

            case "PUBLISHED":
                // Bước 2 của SV2: Xuất bản chính thức lên báo
                latestVersion.setReviewStatus("APPROVED");
                latestVersion.setReviewedBy(DEFAULT_EDITOR_USER_ID);
                if (latestVersion.getReviewedAt() == null) {
                    latestVersion.setReviewedAt(now);
                }
                if (!notes.isEmpty()) {
                    latestVersion.setReviewFeedback(notes);
                }

                // Cập nhật chính sách giá nếu có gửi kèm (UC027)
                if (request.getAccessType() != null) {
                    String accessType = request.getAccessType().toUpperCase();
                    article.setAccessType(accessType);
                    if ("FREE".equals(accessType)) {
                        article.setSinglePrice(BigDecimal.ZERO);
                    } else if (request.getSinglePrice() != null) {
                        article.setSinglePrice(request.getSinglePrice());
                    } else if (article.getSinglePrice() == null || article.getSinglePrice().compareTo(BigDecimal.ZERO) <= 0) {
                        article.setSinglePrice(new BigDecimal("15000.00"));
                    }
                }

                // Đảm bảo thỏa mãn ràng buộc chk_articles_published_version trong MySQL
                article.setPublishedVersion(latestVersion.getVersionNumber());
                article.setLatestVersion(Math.max(article.getLatestVersion(), latestVersion.getVersionNumber()));
                article.setStatus("PUBLISHED");
                if (article.getPublishedAt() == null) {
                    article.setPublishedAt(now);
                }
                break;

            case "UNPUBLISHED":
            case "TAKEN_DOWN":
                // SV2 gỡ bài khỏi trang báo công khai
                article.setStatus("TAKEN_DOWN");
                if (!notes.isEmpty()) {
                    latestVersion.setReviewFeedback(notes);
                }
                break;

            default:
                throw new AppException("Trạng thái bài viết không hợp lệ: " + targetStatus, HttpStatus.BAD_REQUEST);
        }

        versionRepository.save(latestVersion);
        EditorialArticle savedArticle = articleRepository.save(article);

        // Ghi vết vào bảng audit_logs
        String oldJson = String.format("{\"status\":\"%s\"}", oldStatus);
        String newJson = String.format("{\"status\":\"%s\",\"uiTarget\":\"%s\",\"version\":%d}",
                savedArticle.getStatus(), targetStatus, latestVersion.getVersionNumber());
        articleRepository.insertAuditLog(
                DEFAULT_EDITOR_USER_ID,
                "ARTICLE_STATUS_" + targetStatus,
                savedArticle.getArticleId(),
                oldJson,
                newJson
        );

        return mapToDto(savedArticle);
    }

    /**
     * Chuyển đổi từ Entity CSDL sang DTO chuẩn cho Frontend React
     */
    private EditorialArticleDto mapToDto(EditorialArticle article) {
        List<EditorialArticleVersion> versions = versionRepository
                .findByArticleIdOrderByVersionNumberDesc(article.getArticleId());

        EditorialArticleVersion activeVersion = versions.isEmpty() ? null : versions.get(0);

        String title = activeVersion != null ? activeVersion.getTitle() : article.getSlug();
        String summary = activeVersion != null && activeVersion.getSummary() != null ? activeVersion.getSummary() : "";
        String content = activeVersion != null && activeVersion.getContent() != null ? activeVersion.getContent() : "";
        String coverImage = activeVersion != null && activeVersion.getCoverImageUrl() != null
                ? activeVersion.getCoverImageUrl()
                : "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1000";
        String reviewFeedback = activeVersion != null ? activeVersion.getReviewFeedback() : null;

        // Trích xuất 30% preview cho bài viết (Quy tắc 3)
        String previewContent = content;
        if (content.length() > 120) {
            int cutIndex = Math.max(80, (int) (content.length() * 0.3));
            previewContent = content.substring(0, Math.min(content.length(), cutIndex)) + "...";
        }

        String categoryName = Optional.ofNullable(articleRepository.findCategoryNameById(article.getCategoryId()))
                .orElse("Thời sự");
        String categorySlug = Optional.ofNullable(articleRepository.findCategorySlugById(article.getCategoryId()))
                .orElse("thoi-su");
        String authorName = Optional.ofNullable(articleRepository.findUserFullNameById(article.getAuthorId()))
                .orElse("Phóng viên LocalPress");
        List<String> tags = Optional.ofNullable(articleRepository.findTagNamesByArticleId(article.getArticleId()))
                .orElse(Collections.emptyList());

        // Ánh xạ trạng thái từ DB (articles.status + article_versions.review_status) sang trạng thái UI
        String uiStatus = resolveUiStatus(article, activeVersion);

        List<EditorialArticleDto.VersionDto> versionDtos = versions.stream()
                .map(v -> EditorialArticleDto.VersionDto.builder()
                        .versionNumber(v.getVersionNumber())
                        .title(v.getTitle())
                        .sapo(v.getSummary())
                        .content(v.getContent())
                        .changelog(v.getReviewFeedback() != null ? v.getReviewFeedback() : "Phiên bản v" + v.getVersionNumber())
                        .reviewStatus(v.getReviewStatus())
                        .createdAt(v.getCreatedAt())
                        .createdBy(Optional.ofNullable(articleRepository.findUserFullNameById(v.getEditedBy())).orElse("Phóng viên"))
                        .build())
                .collect(Collectors.toList());

        int wordCount = content.isEmpty() ? 100 : content.split("\\s+").length;
        int readTimeMinutes = Math.max(2, (int) Math.ceil(wordCount / 200.0));

        return EditorialArticleDto.builder()
                .id(String.valueOf(article.getArticleId()))
                .title(title)
                .slug(article.getSlug())
                .sapo(summary)
                .content(content)
                .previewContent(previewContent)
                .authorId(String.valueOf(article.getAuthorId()))
                .authorName(authorName)
                .categoryId(String.valueOf(article.getCategoryId()))
                .categoryName(categoryName)
                .categorySlug(categorySlug)
                .coverImage(coverImage)
                .tags(tags)
                .isPremium("PREMIUM".equalsIgnoreCase(article.getAccessType()))
                .price(article.getSinglePrice() != null ? article.getSinglePrice() : BigDecimal.ZERO)
                .status(uiStatus)
                .dbStatus(article.getStatus())
                .reviewNotes(reviewFeedback)
                .views(article.getViewCount() != null ? article.getViewCount() : 0L)
                .publishedAt(article.getPublishedAt())
                .createdAt(article.getCreatedAt())
                .updatedAt(article.getUpdatedAt())
                .readTimeMinutes(readTimeMinutes)
                .currentVersion(article.getLatestVersion())
                .publishedVersion(article.getPublishedVersion())
                .versions(versionDtos)
                .build();
    }

    /**
     * Chuyển đổi trạng thái giữa DB (articles + article_versions) và UI Frontend:
     * - Nếu bài viết có phiên bản mới nhất đang PENDING duyệt -> hiển thị IN_REVIEW để SV2 thấy nút Duyệt / Yêu cầu sửa.
     * - Nếu phiên bản mới nhất đã APPROVED nhưng bài chưa PUBLISHED -> hiển thị APPROVED để SV2 thấy nút Xuất bản ngay.
     * - Nếu phiên bản mới nhất bị REJECTED -> hiển thị CHANGES_REQUESTED.
     * - Nếu bài đang PUBLISHED (và không có bản mới chờ duyệt) -> hiển thị PUBLISHED.
     * - Nếu bài bị TAKEN_DOWN hoặc ARCHIVED -> hiển thị UNPUBLISHED.
     */
    private String resolveUiStatus(EditorialArticle article, EditorialArticleVersion latestVersion) {
        String artStatus = article.getStatus();
        String verStatus = latestVersion != null ? latestVersion.getReviewStatus() : "DRAFT";

        if ("TAKEN_DOWN".equals(artStatus) || "ARCHIVED".equals(artStatus)) {
            return "UNPUBLISHED";
        }
        if ("REJECTED".equals(artStatus) || "REJECTED".equals(verStatus)) {
            return "CHANGES_REQUESTED";
        }
        if ("PENDING".equals(verStatus)) {
            return "IN_REVIEW";
        }
        if ("PUBLISHED".equals(artStatus)) {
            // Nếu có phiên bản mới hơn published_version vừa được APPROVED và chờ nhấn Xuất bản
            if (latestVersion != null && article.getPublishedVersion() != null
                    && latestVersion.getVersionNumber() > article.getPublishedVersion()
                    && "APPROVED".equals(verStatus)) {
                return "APPROVED";
            }
            return "PUBLISHED";
        }
        if ("PENDING".equals(artStatus) && "APPROVED".equals(verStatus)) {
            return "APPROVED";
        }
        if ("PENDING".equals(artStatus)) {
            return "IN_REVIEW";
        }
        return "DRAFT";
    }
}
