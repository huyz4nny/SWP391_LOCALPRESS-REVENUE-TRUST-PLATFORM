package com.localpress.content.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "article_versions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ArticleVersion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "version_id")
    private Long id;

    @Column(name = "article_id", nullable = false)
    private Long articleId;

    @Column(name = "edited_by", nullable = false)
    private Long editedBy;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String sapo;

    @Column(name = "content",nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    @Column(name = "cover_image_url", length = 1000)
    private String coverImageUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata_json", columnDefinition = "JSON")
    private Map<String, Object> metadata;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false)
    private ReviewStatus reviewStatus;

    @Column(name = "review_feedback", columnDefinition = "TEXT")
    private String reviewFeedback;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public static ArticleVersion createDraft(Long articleId,
                                             Long editedBy,
                                             int versionNumber,
                                             String title,
                                             String sapo,
                                             String content,
                                             String source){
        if(versionNumber < 1){
            throw new IllegalArgumentException("Số phiên bản phải lớn hơn hoặc bằng 1");
        }

        ArticleVersion version = new ArticleVersion();
        version.articleId = articleId;
        version.editedBy = editedBy;
        version.versionNumber = versionNumber;
        version.title = title;
        version.sapo = sapo;
        version.content = content;
        version.reviewStatus = ReviewStatus.DRAFT;
        version.metadata = new HashMap<>();

        if(source != null && !source.isBlank()){
            version.metadata.put("source", source.trim());
        }

        return version;
    }

    public void updateDraftCoverImage(String imageUrl, String caption, String altText, String imageSource){
        if (reviewStatus != ReviewStatus.DRAFT) {
            throw new IllegalStateException(
                    "Chỉ được cập nhật ảnh của phiên bản đang là bản nháp"
            );
        }

        if(imageUrl == null || imageUrl.isBlank() || imageUrl.length() > 1000){
            throw new IllegalArgumentException("Đường dẫn ảnh khong hợp lệ");
        }

        if(altText == null || altText.isBlank() || altText.length() > 300){
            throw new IllegalArgumentException("Alt text không hợp lệ");
        }

        if(caption != null && caption.length() > 500){
            throw new IllegalArgumentException("Chú thích ảnh tối đa 500 ký tự");
        }

        if(imageSource != null && imageSource.length() > 300){
            throw new IllegalArgumentException("Nguồn ảnh tối đa 300 ký tự");
        }

        Map<String, Object> updatedMetadata = metadata == null
                ? new HashMap<>()
                : new HashMap<>(metadata);

        putOrRemove(updatedMetadata, "coverCaption", caption);
        putOrRemove(updatedMetadata, "coverAltText", altText);
        putOrRemove(updatedMetadata, "coverSource", imageSource);

        this.coverImageUrl = imageUrl;
        this.metadata = updatedMetadata;
    }

    private static void putOrRemove(Map<String, Object> target, String key, String value){
        if(value == null || value.isBlank()){
            target.remove(key);
        } else {
            target.put(key, value.trim());
        }
    }

    public enum ReviewStatus {
        DRAFT, PENDING, REJECTED, APPROVED
    }
}
