package com.localpress.finance;

import com.localpress.finance.repository.TransactionRepository;
import com.localpress.finance.service.AdOrderExpiryJob;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * TEST: JOB ĐÓNG ĐƠN QUẢNG CÁO QUÁ HẠN GIỮ CHỖ (Rule 6)
 */
@ExtendWith(MockitoExtension.class)
class AdOrderExpiryJobTest {

    @Mock private TransactionRepository transactionRepository;
    @InjectMocks private AdOrderExpiryJob job;

    @Test
    @DisplayName("Đóng các đơn quá hạn tính tới thời điểm chạy job")
    void closesOverdueOrdersAsOfNow() {
        when(transactionRepository.expireOverdueAdOrders(any())).thenReturn(3);
        LocalDateTime before = LocalDateTime.now();

        assertEquals(3, job.expireOverdueAdOrders());

        ArgumentCaptor<LocalDateTime> now = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(transactionRepository).expireOverdueAdOrders(now.capture());
        assertFalse(now.getValue().isBefore(before));
        assertFalse(now.getValue().isAfter(LocalDateTime.now()));
    }

    @Test
    @DisplayName("Không có đơn quá hạn thì không lỗi")
    void nothingToClose() {
        when(transactionRepository.expireOverdueAdOrders(any())).thenReturn(0);
        assertEquals(0, job.expireOverdueAdOrders());
    }

    @Test
    @DisplayName("Câu UPDATE chỉ đóng đơn AD còn PENDING đã qua expiresAt, không đụng bài lẻ / gói")
    void queryOnlyTouchesPendingAdOrders() throws Exception {
        String jpql = TransactionRepository.class
                .getMethod("expireOverdueAdOrders", LocalDateTime.class)
                .getAnnotation(Query.class).value();
        assertTrue(jpql.contains("TransactionStatus.FAILED"));
        assertTrue(jpql.contains("t.status = com.localpress.finance.model.TransactionStatus.PENDING"));
        assertTrue(jpql.contains("TransactionType.AD"));
        assertTrue(jpql.contains("t.expiresAt < :now"));
        assertFalse(jpql.contains("ARTICLE") || jpql.contains("SUBSCRIPTION"));
    }
}
