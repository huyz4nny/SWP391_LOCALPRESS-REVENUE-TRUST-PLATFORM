package com.localpress.reader.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// một dòng lịch sử đọc phục vụ UC039 ở màn hình II.3.6
// lastReadAt dùng để hiện "đã đọc lúc ..." và sắp xếp bài mới đọc lên đầu
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReadingHistoryItemResponse {
    private Long articleId;
    private String title;
    private String slug;
    private Boolean isPremium;
    private String categoryName;
    private String categorySlug;
    private String lastReadAt;
}
