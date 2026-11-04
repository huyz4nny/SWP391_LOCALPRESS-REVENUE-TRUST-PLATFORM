package com.localpress.administration.service;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
@Component("adUrlScheduleSettings")
public class AdUrlScheduleSettings {
    private final boolean enabled;
    private final long delayMs,initialDelayMs;
    private final int minAgeHours,batchSize;
    public AdUrlScheduleSettings(
        @Value("${localpress.url-monitor.enabled:${LOCALPRESS_URL_MONITOR_ENABLED:true}}") boolean enabled,
        @Value("${localpress.url-monitor.delay-ms:${LOCALPRESS_URL_MONITOR_DELAY_MS:300000}}") long delayMs,
        @Value("${localpress.url-monitor.initial-delay-ms:${LOCALPRESS_URL_MONITOR_INITIAL_DELAY_MS:60000}}") long initialDelayMs,
        @Value("${localpress.url-monitor.min-age-hours:${LOCALPRESS_URL_MONITOR_MIN_AGE_HOURS:6}}") int minAgeHours,
        @Value("${localpress.url-monitor.batch-size:${LOCALPRESS_URL_MONITOR_BATCH_SIZE:10}}") int batchSize) {
        if(delayMs<1000||delayMs>86400000||initialDelayMs<0||initialDelayMs>86400000
            ||minAgeHours<1||minAgeHours>168||batchSize<1||batchSize>50)
            throw new IllegalArgumentException("Invalid URL monitor schedule limits");
        this.enabled=enabled;this.delayMs=delayMs;this.initialDelayMs=initialDelayMs;
        this.minAgeHours=minAgeHours;this.batchSize=batchSize;
    }
    public boolean isEnabled(){return enabled;}
    public long getDelayMs(){return delayMs;}
    public long getInitialDelayMs(){return initialDelayMs;}
    public int getMinAgeHours(){return minAgeHours;}
    public int getBatchSize(){return batchSize;}
}
