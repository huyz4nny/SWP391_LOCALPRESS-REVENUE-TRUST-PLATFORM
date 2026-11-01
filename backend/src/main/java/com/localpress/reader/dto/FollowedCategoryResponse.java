package com.localpress.reader.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// một chuyên mục độc giả đang theo dõi phục vụ UC040 ở màn hình II.3.8
// articleCount là số bài đang xuất bản của chuyên mục để trang theo dõi hiện kèm tên
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowedCategoryResponse {
    private Long id;
    private String name;
    private String slug;
    private String description;
    private Long articleCount;
    private String followedAt;
}
