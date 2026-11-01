// package dto của reader chứa các object dùng để trả dữ liệu ra api
package com.localpress.reader.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// dto bình luận đã duyệt hiển thị công khai phục vụ UC031 ở màn hình II.3.2
// luồng đi là ReaderCommentController tạo từ kết quả sql -> trả json -> frontend CommentSection hiển thị
// chỉ chứa bình luận APPROVED (rule 12)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReaderCommentResponse {
    private Long id;
    private Long articleId;
    private Long userId;
    // tên và avatar lấy từ bảng users
    private String userName;
    private String userAvatar;
    private String content;
    private String status;
    private String createdAt;
}
