package com.localpress.finance;

import com.localpress.finance.dto.response.AdvertiserReceivableResponse;
import com.localpress.finance.model.ReceivableReminder;
import com.localpress.finance.repository.ReceivableReminderRepository;
import com.localpress.finance.service.AdvertiserReceivablesService;
import com.localpress.shared.event.ReceivableReminderEvent;
import com.localpress.shared.exception.AppException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TEST: NHẮC NỢ QUẢNG CÁO (SV4 - UC053)
 */
@ExtendWith(MockitoExtension.class)
class AdvertiserReceivablesServiceTest {

    @Mock private JdbcTemplate jdbcTemplate;
    @Mock private ReceivableReminderRepository reminderRepository;
    @Mock private ApplicationEventPublisher eventPublisher;
    @InjectMocks private AdvertiserReceivablesService service;

    private AdvertiserReceivableResponse receivable(String remaining, String group) {
        return AdvertiserReceivableResponse.builder().campaignId(4L).advertiserId(9L).campaignName("Banner cảng")
                .contractValue(new BigDecimal("500000")).remainingDebt(new BigDecimal(remaining))
                .dueDate(LocalDate.now().minusDays(3)).overdueDays(3).debtGroup(group).build();
    }

    @SuppressWarnings("unchecked")
    private void stubReceivable(AdvertiserReceivableResponse r) {
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(4L))).thenReturn(List.of(r));
    }

    @Test
    @DisplayName("Nhắc nợ: lưu lịch sử và phát ReceivableReminderEvent cho SV1 (Rule 17)")
    void sendReminder_savesAndPublishes() {
        stubReceivable(receivable("500000", "OVERDUE"));
        when(reminderRepository.save(any(ReceivableReminder.class))).thenAnswer(inv -> {
            ReceivableReminder r = inv.getArgument(0);
            r.setReminderId(11L);
            return r;
        });

        AdvertiserReceivableResponse result = service.sendReminder(4L, 3L, "  Đề nghị thanh toán  ");

        ArgumentCaptor<ReceivableReminderEvent> event = ArgumentCaptor.forClass(ReceivableReminderEvent.class);
        verify(eventPublisher).publishEvent(event.capture());
        assertEquals(11L, event.getValue().getReminderId());
        assertEquals(9L, event.getValue().getAdvertiserId());
        assertEquals("Đề nghị thanh toán", event.getValue().getNote());
        assertEquals(0, new BigDecimal("500000").compareTo(event.getValue().getAmountDue()));
        assertEquals(1, result.getReminderCount());
    }

    @Test
    @DisplayName("Đã tất toán -> 400, không lưu, không phát sự kiện")
    void sendReminder_paidInFull() {
        stubReceivable(receivable("0", "PAID_IN_FULL"));

        AppException ex = assertThrows(AppException.class, () -> service.sendReminder(4L, 3L, null));

        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        verify(reminderRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("Vừa nhắc trong 24 giờ -> 409")
    void sendReminder_cooldown() {
        stubReceivable(receivable("500000", "OVERDUE"));
        when(reminderRepository.findFirstByCampaignIdOrderBySentAtDesc(4L)).thenReturn(Optional.of(
                ReceivableReminder.builder().campaignId(4L).sentAt(LocalDateTime.now().minusHours(2)).build()));

        AppException ex = assertThrows(AppException.class, () -> service.sendReminder(4L, 3L, null));

        assertEquals(HttpStatus.CONFLICT, ex.getStatus());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    @DisplayName("Không có công nợ cho chiến dịch -> 404")
    @SuppressWarnings("unchecked")
    void sendReminder_notFound() {
        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(4L))).thenReturn(List.of());

        AppException ex = assertThrows(AppException.class, () -> service.sendReminder(4L, 3L, null));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatus());
    }
}
