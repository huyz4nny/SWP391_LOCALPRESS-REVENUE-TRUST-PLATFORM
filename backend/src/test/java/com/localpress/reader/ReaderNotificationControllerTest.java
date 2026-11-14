package com.localpress.reader;

import com.localpress.reader.controller.ReaderNotificationController;
import com.localpress.reader.controller.ReaderPurchaseExceptionHandler;
import com.localpress.reader.dto.ReaderNotificationResponse;
import com.localpress.reader.repository.ReaderNotificationRepository;
import com.localpress.reader.service.ReaderCurrentUser;
import com.localpress.reader.service.ReaderNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ReaderNotificationControllerTest {

    ReaderNotificationRepository repository = mock(ReaderNotificationRepository.class);
    ReaderCurrentUser currentUser = mock(ReaderCurrentUser.class);
    MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(
                        new ReaderNotificationController(new ReaderNotificationService(repository), currentUser))
                .setControllerAdvice(new ReaderPurchaseExceptionHandler())
                .build();
        when(currentUser.requireUserId()).thenReturn(7L);
    }

    @Test
    void listReturnsOwnNotifications() throws Exception {
        when(repository.findInAppForUser(7L, 50)).thenReturn(List.of(new ReaderNotificationResponse(
                3L, "REFUND_COMPLETED", "Đã hoàn tiền 15.000 ₫", "Kế toán đã duyệt", "/account/orders", false,
                "2026-11-13T10:00")));

        mvc.perform(get("/api/v1/reader/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(3))
                .andExpect(jsonPath("$[0].type").value("REFUND_COMPLETED"))
                .andExpect(jsonPath("$[0].linkUrl").value("/account/orders"))
                .andExpect(jsonPath("$[0].read").value(false));
    }

    @Test
    void unreadCount() throws Exception {
        when(repository.countUnread(7L)).thenReturn(2L);

        mvc.perform(get("/api/v1/reader/notifications/unread-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(2));
    }

    @Test
    void markReadOfOwnNotification() throws Exception {
        when(repository.markRead(7L, 3L)).thenReturn(1);

        mvc.perform(put("/api/v1/reader/notifications/3/read")).andExpect(status().isNoContent());
    }

    @Test
    void markReadOfSomeoneElsesNotificationIs404() throws Exception {
        when(repository.markRead(7L, 99L)).thenReturn(0);

        mvc.perform(put("/api/v1/reader/notifications/99/read"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Không tìm thấy thông báo"));
    }

    @Test
    void markAllRead() throws Exception {
        mvc.perform(put("/api/v1/reader/notifications/read-all")).andExpect(status().isNoContent());

        verify(repository).markAllRead(7L);
    }

    @Test
    void guestGets401() throws Exception {
        when(currentUser.requireUserId()).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bạn cần đăng nhập"));

        mvc.perform(get("/api/v1/reader/notifications")).andExpect(status().isUnauthorized());
        verify(repository, never()).findInAppForUser(anyLong(), anyInt());
    }
}
