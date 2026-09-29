package com.localpress.editorial.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity ánh xạ bảng article_versions (Lưu trữ toàn văn và lịch sử duyệt từng phiên bản bài viết).
 * Tuân thủ Quy tắc bất biến số 8: Sửa bài viết đã xuất bản sẽ sinh phiên bản mới,
 * bài cũ vẫn hiển thị cho đến khi Tổng biên tập (SV2) duyệt phiên bản mới.
 */
@Entity
@Table(name = "article_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EditorialArticleVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "version_id")
    private Long versionId;

    @Column(name = "article_id", nullable = false)
    private Long articleId;

    @Column(name = "edited_by", nullable = false)
    private Long editedBy;

    /**
     * ID của Biên tập viên / Tổng biên tập (SV2) thực hiện duyệt phiên bản này
     */
    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "content", nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "cover_image_url", length = 1000)
    private String coverImageUrl;

    @Column(name = "metadata_json", columnDefinition = "JSON")
    private String metadataJson;

    /**
     * Trạng thái duyệt của phiên bản: DRAFT, PENDING, APPROVED, REJECTED
     */
    @Column(name = "review_status", nullable = false, columnDefinition = "ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')")
    private String reviewStatus;

    /**
     * Nhận xét / Lý do yêu cầu sửa của SV2 gửi lại cho phóng viên
     */
    @Column(name = "review_feedback", columnDefinition = "TEXT")
    private String reviewFeedback;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.reviewStatus == null) {
            this.reviewStatus = "DRAFT";
        }
    }
}
