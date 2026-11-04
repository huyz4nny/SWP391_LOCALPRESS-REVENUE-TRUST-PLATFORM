package com.localpress.administration.service;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Scheduled;
@Component
@RequiredArgsConstructor
public class AdUrlScanJob {
    private static final org.slf4j.Logger LOG=org.slf4j.LoggerFactory.getLogger(AdUrlScanJob.class);
    private final AdUrlScheduleSettings settings;
    private final AdUrlScanLease lease;
    private final AdUrlMonitorService monitor;
    @Scheduled(scheduler="adUrlScheduler",fixedDelayString="#{@adUrlScheduleSettings.delayMs}",initialDelayString="#{@adUrlScheduleSettings.initialDelayMs}")
    public void tick() {
        if(!settings.isEnabled()) return;
        try {
            lease.run("batch",()->{
                for(long id:monitor.due(settings.getMinAgeHours(),settings.getBatchSize())) {
                    if(Thread.currentThread().isInterrupted()) break;
                    try { monitor.scanScheduled(id,settings.getMinAgeHours()); }
                    catch(RuntimeException error) {
                        LOG.warn("AD_URL_AUTO_FAILED creativeId={} exceptionType={}",id,error.getClass().getSimpleName());
                    }
                }
                return true;
            });
        } catch(RuntimeException error) { LOG.warn("AD_URL_BATCH_FAILED exceptionType={}",error.getClass().getSimpleName()); }
    }
}
