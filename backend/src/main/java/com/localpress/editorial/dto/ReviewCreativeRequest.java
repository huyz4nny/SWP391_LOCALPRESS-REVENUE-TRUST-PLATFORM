package com.localpress.editorial.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request kiểm duyệt creative quảng cáo (Màn II.2.6 - UC020).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewCreativeRequest {
    private boolean approved;
    private String notes;
}
