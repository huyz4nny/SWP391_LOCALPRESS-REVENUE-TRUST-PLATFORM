package com.localpress.delivery.service;

import com.localpress.delivery.repository.AdServingRepository;
import com.localpress.delivery.repository.AdServingRepository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class AdServingService {
    private final AdServingRepository ads;
    private final Map<String,Ticket> tickets=new ConcurrentHashMap<>();
    private static final ZoneId ZONE=ZoneId.of("Asia/Ho_Chi_Minh");
    private static class Ticket {
        final String slotCode;
        final Creative creative;
        final Instant expires=Instant.now().plusSeconds(600);
        boolean seen,clicked;
        LocalDate date;
        Ticket(String code,Creative creative) {this.slotCode=code;this.creative=creative;}
    }
    public record Offer(Slot slot,Creative creative,String trackingToken,boolean hidden) {
        public Offer(Slot slot,Creative creative,String token) {this(slot,creative,token,false);}
    }
    public Offer serve(String code,String email) {
        Slot slot=ads.slots().stream().filter(s->s.code().equals(code)).findFirst().orElseThrow(()->
                new ResponseStatusException(HttpStatus.NOT_FOUND,"Vị trí quảng cáo không tồn tại"));
        LocalDate today=LocalDate.now(ZONE);
        if(ads.adFree(email,today)) return new Offer(slot,null,null,true);
        List<Creative> candidates=ads.eligible(code,today).stream().filter(AdServingService::validCreative).toList();
        if(candidates.isEmpty()) return new Offer(slot,null,null);
        tickets.entrySet().removeIf(e->e.getValue().expires.isBefore(Instant.now()));
        if(tickets.size()>=10000) return new Offer(slot,null,null);
        Creative c=candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));
        String token=UUID.randomUUID().toString();
        tickets.put(token,new Ticket(code,c));
        return new Offer(slot,c,token);
    }
    public boolean track(String token,boolean click) {
        Ticket t=tickets.get(token);
        if(t==null||t.expires.isBefore(Instant.now())) return false;
        synchronized(t) {
            if(ads.eligible(t.slotCode,LocalDate.now(ZONE)).stream().noneMatch(c->c.creativeId()==t.creative.creativeId())) return false;
            if(!click&&!t.seen) {t.date=LocalDate.now(ZONE);ads.impression(t.creative,t.date);t.seen=true;return true;}
            if(click&&t.seen&&!t.clicked) {ads.click(t.creative,t.date);t.clicked=true;return true;}
            return false;
        }
    }
    public static boolean validCreative(Creative creative) {
        return safeUrl(creative.imageUrl()) && safeUrl(creative.targetUrl());
    }
    private static boolean safeUrl(String url) {
        try {URI u=URI.create(url);return ("http".equalsIgnoreCase(u.getScheme())||"https".equalsIgnoreCase(u.getScheme()))
                &&u.getHost()!=null&&u.getUserInfo()==null;} catch(Exception e) {return false;}
    }
}
