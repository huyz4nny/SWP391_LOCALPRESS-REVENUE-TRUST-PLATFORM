package com.localpress.reader.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// trạng thái lưu bài sau khi gọi PUT hoặc DELETE /api/v1/reader/saved-articles/{articleId} ở UC038
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BookmarkStateResponse {
    private Long articleId;
    private boolean saved;
}
