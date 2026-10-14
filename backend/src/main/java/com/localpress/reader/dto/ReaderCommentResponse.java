package com.localpress.reader.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReaderCommentResponse {
    private Long id;
    private Long articleId;
    private Long userId;
    private String userName;
    private String userAvatar;
    private String content;
    private String status;
    private String createdAt;
}
