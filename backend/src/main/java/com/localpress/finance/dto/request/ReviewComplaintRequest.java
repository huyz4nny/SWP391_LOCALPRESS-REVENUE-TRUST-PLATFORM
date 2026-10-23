package com.localpress.finance.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO: Kế toán ghi nhận (note không bắt buộc) hoặc từ chối (note bắt buộc = lý do) một khiếu nại.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReviewComplaintRequest {

    @Size(max = 500)
    private String note;
}
