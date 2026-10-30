package com.localpress.finance.demostore;

import com.localpress.finance.dto.response.OrderCreateResponse;
import com.localpress.finance.service.FinanceCurrentUser;
import com.localpress.shared.exception.AppException;
import com.localpress.shared.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Cửa hàng thử cho demo luồng thanh toán (xem DemoStoreService). Không có ở môi trường khác dev,
 * và ở dev chỉ có khi bật localpress.demo-store.enabled=true; tắt thì endpoint trả 404.
 */
@RestController
@RequestMapping("/api/v1/finance/dev/demo-store")
@Profile("dev")
@ConditionalOnProperty(name = "localpress.demo-store.enabled", havingValue = "true")
@RequiredArgsConstructor
public class DemoStoreController {

    private final DemoStoreService demoStoreService;
    private final FinanceCurrentUser currentUser;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> catalog() {
        return ResponseEntity.ok(ApiResponse.ok("Cửa hàng thử", demoStoreService.catalog(currentUser.require().userId())));
    }

    /** Body: {"type": "ARTICLE" | "SUBSCRIPTION", "itemId": 1}. Không nhận giá từ trình duyệt. */
    @PostMapping("/purchase")
    public ResponseEntity<ApiResponse<OrderCreateResponse>> purchase(@RequestBody Map<String, Object> body) {
        Object raw = body.get("itemId");
        Long itemId;
        try {
            itemId = raw instanceof Number n ? n.longValue() : raw == null ? null : Long.valueOf(raw.toString().trim());
        } catch (NumberFormatException e) {
            throw new AppException("Mã món hàng phải là số", HttpStatus.BAD_REQUEST);
        }
        OrderCreateResponse order = demoStoreService.purchase(currentUser.require().userId(),
                String.valueOf(body.get("type")), itemId);
        return ResponseEntity.ok(ApiResponse.ok("Đã tạo đơn, chuyển sang trang thanh toán", order));
    }
}
