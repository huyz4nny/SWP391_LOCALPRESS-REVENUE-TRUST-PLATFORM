package com.localpress.delivery;

import com.localpress.delivery.repository.AdServingRepository;
import com.localpress.delivery.repository.AdServingRepository.*;
import com.localpress.delivery.service.AdServingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdServingServiceTest {
    @Mock AdServingRepository ads;
    AdServingService service;
    final Slot slot=new Slot("1","TOP","Top","970x90",1);
    final Creative creative=new Creative(10,20,"Paid campaign","https://example.test/banner.png","https://example.test/landing","Test company");
    @BeforeEach void setup() {service=new AdServingService(ads);}
    void eligible() {
        when(ads.slots()).thenReturn(List.of(slot));
        when(ads.eligible(eq("TOP"),any())).thenReturn(List.of(creative));
    }
    @Test void paidEligibleBannerIsReturnedWithoutCountingAViewBeforeImageLoad() {
        eligible();
        var offer=service.serve("TOP",null);
        assertEquals(20,offer.creative().creativeId());
        assertNotNull(offer.trackingToken());
        verify(ads,never()).impression(any(),any());
    }
    @Test void replayAndClickWithoutAnImpressionDoNotInflateStatistics() {
        eligible();
        var token=service.serve("TOP",null).trackingToken();
        assertFalse(service.track(token,true));
        assertTrue(service.track(token,false));
        assertFalse(service.track(token,false));
        assertTrue(service.track(token,true));
        assertFalse(service.track(token,true));
        verify(ads,times(1)).impression(eq(creative),any());
        verify(ads,times(1)).click(eq(creative),any());
    }
    @Test void suspendedOrReplacedCampaignStopsTrackingImmediately() {
        eligible();
        var token=service.serve("TOP",null).trackingToken();
        when(ads.eligible(eq("TOP"),any())).thenReturn(List.of());
        assertFalse(service.track(token,false));
        verify(ads,never()).impression(any(),any());
    }
    @Test void adFreeReaderReceivesNoOfferAndDoesNotConsumeInventory() {
        when(ads.slots()).thenReturn(List.of(slot));
        when(ads.adFree(eq("reader@example.test"),any())).thenReturn(true);
        var offer=service.serve("TOP","reader@example.test");
        assertTrue(offer.hidden());
        assertNull(offer.creative());
        verify(ads,never()).eligible(any(),any());
    }
    @Test void emptyInventoryReturnsAnEmptyOfferInsteadOfMockAdvertising() {
        when(ads.slots()).thenReturn(List.of(slot));
        assertNull(service.serve("TOP",null).creative());
    }
    @Test void unsafeCreativeLinksAreNotServed() {
        when(ads.slots()).thenReturn(List.of(slot));
        when(ads.eligible(eq("TOP"),any())).thenReturn(List.of(new Creative(10,20,"Unsafe",creative.imageUrl(),"javascript:alert(1)","Test")));
        assertNull(service.serve("TOP",null).creative());
    }
    @Test void unknownTrackingTokensAreIgnored() {
        assertFalse(service.track("unknown-token",false));
        verifyNoInteractions(ads);
    }
    @Test void unknownSlotIsNotFound() {
        assertEquals(404,assertThrows(ResponseStatusException.class,()->service.serve("NO-SLOT",null)).getStatusCode().value());
    }
}
