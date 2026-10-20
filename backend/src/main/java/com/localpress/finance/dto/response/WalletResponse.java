package com.localpress.finance.dto.response;

import com.localpress.finance.model.WalletEntry;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO: Số dư và lịch sử biến động Ví LocalPress của người dùng đang đăng nhập.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletResponse {

    private BigDecimal balance;

    private String currency;

    private List<Entry> entries;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Entry {
        private Long entryId;
        private Long transactionId;
        private String direction;
        private BigDecimal amount;
        private BigDecimal balanceAfter;
        private String reason;
        private LocalDateTime createdAt;

        public static Entry fromEntity(WalletEntry e) {
            return Entry.builder()
                    .entryId(e.getEntryId())
                    .transactionId(e.getTransactionId())
                    .direction(e.getDirection().name())
                    .amount(e.getAmount())
                    .balanceAfter(e.getBalanceAfter())
                    .reason(e.getReason())
                    .createdAt(e.getCreatedAt())
                    .build();
        }
    }
}
