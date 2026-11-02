package com.localpress.reader.dto;

// kết quả UC042 sau khi bình luận đang hiển thị bị đưa về hàng chờ
public record ReportCommentResponse(Long commentId, String status) {
}
