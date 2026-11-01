package com.localpress.reader.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// nội dung bình luận mới, mã bài lấy từ body vì đường dẫn không có articleId
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommentContentRequest {
    private Long articleId;
    private String content;
}
