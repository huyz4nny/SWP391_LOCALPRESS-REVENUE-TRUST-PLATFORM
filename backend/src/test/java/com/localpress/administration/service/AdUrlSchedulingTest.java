package com.localpress.administration.service;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Supplier;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
@SpringJUnitConfig(AdUrlSchedulingTest.Config.class)
@TestPropertySource(properties={"localpress.url-monitor.enabled=true","localpress.url-monitor.delay-ms=1000","localpress.url-monitor.initial-delay-ms=50"})
@DirtiesContext
class AdUrlSchedulingTest {
    @Autowired CountDownLatch ticks;
    @Test void springActuallyRunsConfiguredScheduleWithoutCallingTickDirectly() throws Exception {
        assertTrue(ticks.await(5,TimeUnit.SECONDS));
    }
    @Configuration
    @Import({AdUrlScheduleSettings.class,AdUrlScanJob.class,AdUrlSchedulingConfiguration.class})
    static class Config {
        @Bean CountDownLatch ticks(){return new CountDownLatch(2);}
        @Bean AdUrlScanLease lease(){
            var lease=mock(AdUrlScanLease.class);
            when(lease.run(eq("batch"),any())).thenAnswer(i->Optional.ofNullable(((Supplier<?>)i.getArgument(1)).get()));
            return lease;
        }
        @Bean AdUrlMonitorService monitor(CountDownLatch ticks){
            var monitor=mock(AdUrlMonitorService.class);
            when(monitor.due(6,10)).thenReturn(List.of(1L));
            doAnswer(i->{ticks.countDown();return null;}).when(monitor).scanScheduled(1,6);
            return monitor;
        }
    }
}
