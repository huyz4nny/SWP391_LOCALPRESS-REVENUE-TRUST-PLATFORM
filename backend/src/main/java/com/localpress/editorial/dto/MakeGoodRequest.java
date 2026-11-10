package com.localpress.editorial.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request bù ngày phát sóng (Make-Good Scheduling - UC024).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MakeGoodRequest {

    @NotNull(message = "Số ngày bù phát sóng không được để trống")
    @Min(value = 1, message = "Số ngày bù phát sóng tối thiểu là 1 ngày")
    @Max(value = 60, message = "Số ngày bù phát sóng tối đa là 60 ngày")
    private Integer extraDays;

    @NotBlank(message = "Lý do bù phát sóng không được để trống")
    private String reason;
}
