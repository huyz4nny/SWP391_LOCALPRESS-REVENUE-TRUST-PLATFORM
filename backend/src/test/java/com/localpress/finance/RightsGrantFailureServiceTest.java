package com.localpress.finance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.finance.service.RightsGrantFailureService;
import com.localpress.shared.event.RightsGrantFailedEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TEST: TIỀN ĐÃ VỀ NHƯNG MODULE NGUỒN KHÔNG CẤP ĐƯỢC QUYỀN (RightsGrantFailedEvent, Rule 5)
 */
@ExtendWith(MockitoExtension.class)
class RightsGrantFailureServiceTest {

    @Mock private JdbcTemplate jdbcTemplate;
    private RightsGrantFailureService service;

    @BeforeEach
    void setUp() {
        service = new RightsGrantFailureService(jdbcTemplate, new ObjectMapper());
    }

    private RightsGrantFailedEvent event() {
        return RightsGrantFailedEvent.builder().transactionId(42L).transactionType("ARTICLE").targetId(7L).userId(6L)
                .amount(new BigDecimal("15000")).sourceModule("SV3").reason("Số tiền thấp hơn giá bài").build();
    }

    @Test
    @DisplayName("Ghi audit_logs RIGHTS_GRANT_FAILED cho đúng giao dịch, kèm lý do để kế toán xem")
    void recordsFailureOncePerTransaction() {
        when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any())).thenReturn(1);

        service.onRightsGrantFailed(event());

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object> detail = ArgumentCaptor.forClass(Object.class);
        verify(jdbcTemplate).update(sql.capture(), eq("RIGHTS_GRANT_FAILED"), eq(42L), detail.capture(),
                eq("RIGHTS_GRANT_FAILED"), eq(42L));
        assertTrue(sql.getValue().contains("NOT EXISTS"), "sự kiện lặp chỉ ghi một lần");
        assertTrue(detail.getValue().toString().contains("Số tiền thấp hơn giá bài"));
        assertTrue(detail.getValue().toString().contains("\"sourceModule\":\"SV3\""));
    }

    @Test
    @DisplayName("Lỗi DB không ném ra ngoài: giao dịch tiền đã ghi nhận không bị ảnh hưởng")
    void neverThrows() {
        when(jdbcTemplate.update(anyString(), any(), any(), any(), any(), any())).thenThrow(new RuntimeException("DB down"));

        assertDoesNotThrow(() -> service.onRightsGrantFailed(event()));
    }

    @Test
    @DisplayName("Sự kiện thiếu mã giao dịch thì bỏ qua")
    void ignoresEventWithoutTransaction() {
        service.onRightsGrantFailed(RightsGrantFailedEvent.builder().reason("x").build());
        service.onRightsGrantFailed(null);

        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    @DisplayName("Chỉ đếm lỗi chưa có đề xuất hoàn (đề xuất bị từ chối thì vẫn tính là chưa xử lý)")
    void countsOnlyUnresolved() {
        when(jdbcTemplate.queryForObject(anyString(), eq(Long.class))).thenReturn(3L);

        assertEquals(3, service.countUnresolved());

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForObject(sql.capture(), eq(Long.class));
        assertTrue(sql.getValue().contains("r.status <> 'REJECTED'"));
    }
}
