package com.localpress.delivery;

import com.localpress.delivery.repository.AdServingRepository;
import com.localpress.delivery.repository.AdServingRepository.*;
import com.localpress.delivery.service.AdServingService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdServingCapacityTest {
    private final AdServingRepository ads = mock(AdServingRepository.class);
    private final Creative creative = new Creative(10,20,"Campaign","https://example.test/banner.png","https://example.test/landing","Company");
    private final MutableClock clock = new MutableClock();

    private AdServingService service() {
        when(ads.slots()).thenReturn(List.of(new Slot("1","TOP","Top","970x90",1)));
        when(ads.eligible(eq("TOP"),any())).thenReturn(List.of(creative));
        return new AdServingService(ads, clock);
    }

    @Test void aBurstFromOnePeerCannotExhaustOtherReaders() {
        var service = service();
        for (int i=0;i<60;i++) assertNotNull(service.serve("TOP",null,"198.51.100.1").creative());
        assertEquals(429, assertThrows(ResponseStatusException.class,
                () -> service.serve("TOP",null,"198.51.100.1")).getStatusCode().value());
        assertNotNull(service.serve("TOP",null,"198.51.100.2").creative());
        verify(ads,times(61)).slots();
        clock.now = clock.now.plusSeconds(60);
        assertNotNull(service.serve("TOP",null,"198.51.100.1").creative());
    }

    @Test void tenThousandTicketsNeverTurnOffServingAndMemoryStaysBounded() {
        var service = service();
        String first = service.serve("TOP",null).trackingToken();
        String latest = null;
        for (int i=0;i<10_000;i++) {
            var offer = service.serve("TOP",null);
            assertNotNull(offer.creative());
            latest = offer.trackingToken();
        }
        assertEquals(10_000, ((Map<?,?>) ReflectionTestUtils.getField(service,"tickets")).size());
        assertFalse(service.track(first,false));
        assertTrue(service.track(latest,false));
    }

    @Test void expiredTicketsCannotBeTrackedAndAreReclaimedOnNextServe() {
        var service = service();
        String first = service.serve("TOP",null).trackingToken();
        clock.now = clock.now.plusSeconds(600);
        assertFalse(service.track(first,false));
        assertNotNull(service.serve("TOP",null).creative());
        assertEquals(1, ((Map<?,?>) ReflectionTestUtils.getField(service,"tickets")).size());
    }

    @Test void concurrentRequestsCannotBypassThePerPeerBudget() throws Exception {
        var service = service();
        var pool = Executors.newFixedThreadPool(8);
        try {
            List<Callable<Boolean>> calls = new ArrayList<>();
            for (int i=0;i<80;i++) calls.add(() -> {
                try { service.serve("TOP",null,"198.51.100.1"); return true; }
                catch (ResponseStatusException e) { assertEquals(429,e.getStatusCode().value()); return false; }
            });
            int accepted=0;
            for (var result : pool.invokeAll(calls)) if (result.get()) accepted++;
            assertEquals(60,accepted);
        } finally { pool.shutdownNow(); }
    }

    static class MutableClock extends Clock {
        volatile Instant now = Instant.parse("2026-10-31T00:00:00Z");
        public ZoneId getZone() { return ZoneOffset.UTC; }
        public Clock withZone(ZoneId zone) { return Clock.fixed(now,zone); }
        public Instant instant() { return now; }
    }
}
