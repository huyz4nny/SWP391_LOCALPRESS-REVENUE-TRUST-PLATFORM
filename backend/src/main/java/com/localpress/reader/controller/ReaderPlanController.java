package com.localpress.reader.controller;

import com.localpress.reader.dto.PublicSubscriptionPlanResponse;
import com.localpress.reader.repository.ReaderPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// catalog gói công khai cho độc giả mua, SecurityConfig đã permitAll GET đường dẫn này
@RestController
@RequestMapping("/api/v1/subscription-plans")
@RequiredArgsConstructor
public class ReaderPlanController {

    private final ReaderPlanRepository planRepository;

    @GetMapping
    public List<PublicSubscriptionPlanResponse> listActive() {
        return planRepository.findActive();
    }
}
