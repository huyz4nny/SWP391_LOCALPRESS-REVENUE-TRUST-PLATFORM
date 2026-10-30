package com.localpress.delivery;

import com.localpress.delivery.controller.AdServingController;
import com.localpress.delivery.repository.AdServingRepository;
import com.localpress.delivery.repository.AdServingRepository.*;
import com.localpress.delivery.service.AdServingService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdServingPeerAddressTest {
    @Test void forwardedHeaderSpoofingCannotResetThePeerBudget() throws Exception {
        var ads=mock(AdServingRepository.class);
        when(ads.slots()).thenReturn(List.of(new Slot("1","TOP","Top","970x90",1)));
        when(ads.eligible(eq("TOP"),any())).thenReturn(List.of(new Creative(10,20,"Campaign",
                "https://example.test/banner.png","https://example.test/landing","Company")));
        var mvc=MockMvcBuilders.standaloneSetup(new AdServingController(new AdServingService(ads))).build();
        for(int i=0;i<60;i++) mvc.perform(get("/api/v1/delivery/ad-slots/TOP/serve")
                .with(r -> {r.setRemoteAddr("198.51.100.1");return r;})
                .header("X-Forwarded-For","203.0.113."+i)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/delivery/ad-slots/TOP/serve")
                .with(r -> {r.setRemoteAddr("198.51.100.1");return r;})
                .header("X-Forwarded-For","203.0.113.250")).andExpect(status().isTooManyRequests());
        mvc.perform(get("/api/v1/delivery/ad-slots/TOP/serve")
                .with(r -> {r.setRemoteAddr("198.51.100.2");return r;})).andExpect(status().isOk());
    }
}
