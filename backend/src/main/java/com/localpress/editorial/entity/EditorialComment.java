package com.localpress.editorial.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity ánh xạ bảng 'comments' phục vụ UC026 (Kiểm duyệt bình luận độc giả).
 * Tuân thủ Quy tắc bất biến số 12: Bình luận khi người dùng chỉnh sửa sẽ quay về PENDING,
 * Moderator (SV2) phải duyệt lại (APPROVED) mới được hiển thị công khai.
 */
@Entity
@Table(name = "comments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EditorialComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "comment_id")
    private Long commentId;

    @Column(name = "article_id", nullable = false)
    private Long articleId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "parent_id")
    private Long parentId;

    /**
     * ID của Kiểm duyệt viên / Biên tập viên (SV2) thực hiện duyệt/từ chối bình luận này
     */
    @Column(name = "moderated_by")
    private Long moderatedBy;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    /**
     * Trạng thái kiểm duyệt: PENDING (Chờ duyệt), APPROVED (Đã duyệt), REJECTED (Từ chối), HIDDEN (Ẩn vi phạm)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CommentStatus status;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public enum CommentStatus {
        PENDING, APPROVED, REJECTED, HIDDEN
    }

    public void approve(Long moderatorId) {
        this.status = CommentStatus.APPROVED;
        this.moderatedBy = moderatorId;
    }

    public void reject(Long moderatorId) {
        this.status = CommentStatus.REJECTED;
        this.moderatedBy = moderatorId;
    }

    public void hide(Long moderatorId) {
        this.status = CommentStatus.HIDDEN;
        this.moderatedBy = moderatorId;
    }
}
