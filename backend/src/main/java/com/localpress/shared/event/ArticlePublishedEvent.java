package com.localpress.shared.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Hợp đồng sự kiện bài được xuất bản. SV5 giữ class này. SV2 phát bên trong transaction xuất bản,
 * sau khi trạng thái PUBLISHED và publishedVersion đã lưu, trước khi commit.
 * Không phát khi chỉ APPROVED hoặc gửi duyệt. Bản sửa của bài đã công khai thì firstPublication = false.
 */
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class ArticlePublishedEvent {

    private String eventId;
    private Long articleId;
    private Long categoryId;
    private Integer versionNumber;
    private String title;
    private String slug;
    private Instant publishedAt;
    private boolean firstPublication;
}
