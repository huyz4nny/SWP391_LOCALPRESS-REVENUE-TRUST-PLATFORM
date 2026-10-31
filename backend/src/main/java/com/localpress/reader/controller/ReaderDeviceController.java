package com.localpress.reader.controller;

import com.localpress.reader.dto.ReaderDeviceResponse;
import com.localpress.reader.service.ReaderCurrentUser;
import com.localpress.reader.service.ReaderDeviceSessionService;
import com.localpress.shared.device.DeviceSessionContext;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// UC043 danh sách và thu hồi phiên của user đang đăng nhập
@RestController
@RequestMapping("/api/v1/reader")
@RequiredArgsConstructor
public class ReaderDeviceController {

    private final ReaderDeviceSessionService deviceService;
    private final ReaderCurrentUser readerCurrentUser;

    @GetMapping("/devices")
    public List<ReaderDeviceResponse> list(HttpServletRequest request) {
        Long userId = readerCurrentUser.requireUserId();
        Object sessionId = request.getAttribute(DeviceSessionContext.SESSION_ID);
        return deviceService.listMine(userId, sessionId instanceof String value ? value : null);
    }

    @DeleteMapping("/devices/{deviceId:\\d+}")
    public ResponseEntity<Void> revoke(@PathVariable long deviceId) {
        deviceService.revoke(readerCurrentUser.requireUserId(), deviceId);
        return ResponseEntity.noContent().build();
    }
}
