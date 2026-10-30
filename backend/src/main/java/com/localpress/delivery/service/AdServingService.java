package com.localpress.delivery.service;

import com.localpress.delivery.repository.AdServingRepository;
import com.localpress.delivery.repository.AdServingRepository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.time.*;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class AdServingService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int MAX_TICKETS = 10_000;
    private static final int MAX_CLIENTS = 10_000;
    private static final int REQUESTS_PER_MINUTE = 60;
    private final AdServingRepository ads;
    private final Clock clock;
    // Insertion order allows bounded, constant-time oldest-ticket eviction.
    private final Map<String, Ticket> tickets = new LinkedHashMap<>();
    private final Map<String, RequestWindow> clients = new LinkedHashMap<>();

    @Autowired
    public AdServingService(AdServingRepository ads) { this(ads, Clock.system(ZONE)); }

    public AdServingService(AdServingRepository ads, Clock clock) {
        this.ads = ads;
        this.clock = clock;
    }

    private static class RequestWindow {
        final Instant start;
        int requests;
        RequestWindow(Instant start) { this.start = start; }
    }

    private static class Ticket {
        final String slotCode;
        final Creative creative;
        final Instant expires;
        boolean seen, clicked;
        LocalDate date;
        Ticket(String code, Creative creative, Instant now) {
            this.slotCode = code;
            this.creative = creative;
            this.expires = now.plusSeconds(600);
        }
    }

    public record Offer(Slot slot, Creative creative, String trackingToken, boolean hidden) {
        public Offer(Slot slot, Creative creative, String token) { this(slot, creative, token, false); }
    }

    /** Trusted internal caller; HTTP callers must use the peer-address overload. */
    public Offer serve(String code, String email) { return createOffer(code, email); }

    public Offer serve(String code, String email, String remoteAddress) {
        enforceRateLimit(remoteAddress == null ? "unknown-peer" : remoteAddress);
        return createOffer(code, email);
    }

    private void enforceRateLimit(String client) {
        Instant now = clock.instant();
        synchronized (clients) {
            RequestWindow window = clients.get(client);
            if (window == null || !now.isBefore(window.start.plusSeconds(60))) {
                clients.remove(client);
                // Bound the peer-address map as well as the token map.
                if (clients.size() >= MAX_CLIENTS) clients.remove(clients.keySet().iterator().next());
                window = new RequestWindow(now);
                clients.put(client, window);
            }
            if (window.requests >= REQUESTS_PER_MINUTE) {
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                        "Quá nhiều yêu cầu quảng cáo. Vui lòng thử lại sau một phút");
            }
            window.requests++;
        }
    }

    private Offer createOffer(String code, String email) {
        Slot slot = ads.slots().stream().filter(s -> s.code().equals(code)).findFirst().orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Vị trí quảng cáo không tồn tại"));
        LocalDate today = LocalDate.now(clock.withZone(ZONE));
        if (ads.adFree(email, today)) return new Offer(slot, null, null, true);
        List<Creative> candidates = ads.eligible(code, today).stream().filter(AdServingService::validCreative).toList();
        if (candidates.isEmpty()) return new Offer(slot, null, null);
        Creative creative = candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));
        String token = UUID.randomUUID().toString();
        synchronized (tickets) {
            Instant now = clock.instant();
            var iterator = tickets.entrySet().iterator();
            while (iterator.hasNext()) {
                if (now.isBefore(iterator.next().getValue().expires)) break;
                iterator.remove();
            }
            // Reclaim the oldest ticket instead of hiding banners for everybody.
            if (tickets.size() >= MAX_TICKETS) tickets.remove(tickets.keySet().iterator().next());
            tickets.put(token, new Ticket(code, creative, now));
        }
        return new Offer(slot, creative, token);
    }

    public boolean track(String token, boolean click) {
        Ticket ticket;
        synchronized (tickets) {
            ticket = tickets.get(token);
            if (ticket == null) return false;
            if (!clock.instant().isBefore(ticket.expires)) {
                tickets.remove(token);
                return false;
            }
        }
        synchronized (ticket) {
            if (!clock.instant().isBefore(ticket.expires)) return false;
            if (ads.eligible(ticket.slotCode, LocalDate.now(clock.withZone(ZONE))).stream()
                    .noneMatch(c -> c.creativeId() == ticket.creative.creativeId())) return false;
            if (!click && !ticket.seen) {
                ticket.date = LocalDate.now(clock.withZone(ZONE));
                ads.impression(ticket.creative, ticket.date);
                ticket.seen = true;
                return true;
            }
            if (click && ticket.seen && !ticket.clicked) {
                ads.click(ticket.creative, ticket.date);
                ticket.clicked = true;
                synchronized (tickets) { tickets.remove(token); }
                return true;
            }
            return false;
        }
    }

    public static boolean validCreative(Creative creative) {
        return safeUrl(creative.imageUrl()) && safeUrl(creative.targetUrl());
    }

    private static boolean safeUrl(String url) {
        try {
            URI uri = URI.create(url);
            return ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null && uri.getUserInfo() == null;
        } catch (Exception e) { return false; }
    }
}
