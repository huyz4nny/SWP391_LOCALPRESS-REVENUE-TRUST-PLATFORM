package com.localpress.reader.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// trạng thái theo dõi sau khi gọi PUT hoặc DELETE /api/v1/reader/followed-categories/{categoryId} ở UC040
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FollowStateResponse {
    private Long categoryId;
    private boolean following;
}
