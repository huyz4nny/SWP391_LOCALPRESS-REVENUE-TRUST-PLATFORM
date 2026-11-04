package com.localpress.administration.service;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import java.util.*;
import java.util.function.Supplier;
class AdUrlScanJobTest {
    @Test void oneFailureDoesNotPreventLaterCreativesBeingScanned() {
        var lease=mock(AdUrlScanLease.class);var monitor=mock(AdUrlMonitorService.class);
        when(lease.run(eq("batch"),any())).thenAnswer(i->Optional.ofNullable(((Supplier<?>)i.getArgument(1)).get()));
        when(monitor.due(6,10)).thenReturn(List.of(1L,2L));
        doThrow(new IllegalStateException()).when(monitor).scanScheduled(1,6);
        new AdUrlScanJob(new AdUrlScheduleSettings(true,300000,60000,6,10),lease,monitor).tick();
        verify(monitor).scanScheduled(2,6);
    }
    @Test void invalidLimitsAreRejected() {
        assertThrows(IllegalArgumentException.class,()->new AdUrlScheduleSettings(true,0,0,6,10));
        assertThrows(IllegalArgumentException.class,()->new AdUrlScheduleSettings(true,1000,0,0,10));
        assertThrows(IllegalArgumentException.class,()->new AdUrlScheduleSettings(true,1000,0,6,51));
    }
}
