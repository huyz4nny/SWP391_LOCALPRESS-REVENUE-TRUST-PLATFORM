package com.localpress.finance.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ==============================================================================
 * DTO REQUEST: KẾ TOÁN XÁC NHẬN CHUYỂN KHOẢN THÀNH CÔNG (UC051)
 * ==============================================================================
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManualTransferConfirmRequest {

    /**
     * Mã bút toán / mã giao dịch ngân hàng do Kế toán đối chiếu từ sao kê thực tế.
     */
    @Size(max = 255, message = "Mã tham chiếu ngân hàng không được vượt quá 255 ký tự")
    private String bankReferenceCode;

    /**
     * Mã ngân hàng nơi tiền đổ về (vd: VCB, TCB, MB, ACB).
     */
    @Size(max = 20, message = "Mã ngân hàng không được vượt quá 20 ký tự")
    private String bankCode;

    /**
     * Ghi chú nghiệp vụ của Kế toán khi xác nhận.
     */
    @Size(max = 500, message = "Ghi chú không được vượt quá 500 ký tự")
    private String note;
}
