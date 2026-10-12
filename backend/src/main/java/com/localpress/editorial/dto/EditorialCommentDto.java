package com.localpress.editorial.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.time.LocalDateTime;

/**
 * DTO trả về thông tin bình luận độc giả cho màn hình Content Policy and Moderation (UC026).
 * Khớp 100% với kiểu Comment của React Frontend.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EditorialCommentDto {

    private String id;
    private String articleId;
    private String articleTitle;
    private String articleSlug;
    private String userId;
    private String userName;
    private String userAvatar;
    private String content;
    private String status;
    private LocalDateTime createdAt;
    private int likeCount;

    @JsonProperty("reported")
    private boolean reported;

    private String reportReason;
    private String moderatedBy;
    private String moderatorName;
}
