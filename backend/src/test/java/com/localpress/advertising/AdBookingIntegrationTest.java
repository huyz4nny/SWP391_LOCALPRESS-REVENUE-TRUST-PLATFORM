package com.localpress.advertising;

import com.localpress.finance.dto.response.OrderCreateResponse;
import com.localpress.shared.event.PaymentSuccessEvent;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Kiểm thử trên MySQL thật (khóa lịch không chứng minh được bằng mock). Ghi dữ liệu vào DB nên chỉ chạy khi bật rõ ràng,
 * với một schema riêng, ví dụ:
 * mvn test -Dtest=AdBookingIntegrationTest -Dlocalpress.it=true
 *   -Dspring.datasource.url="jdbc:mysql://localhost:3306/localpress_sv1_it?createDatabaseIfNotExist=true&serverTimezone=Asia/Ho_Chi_Minh&allowPublicKeyRetrieval=true&useSSL=false"
 */
@SpringBootTest(properties = {"localpress.sepay.merchant-id=IT", "localpress.sepay.secret-key=it-test-key"})
@EnabledIfSystemProperty(named = "localpress.it", matches = "true")
class AdBookingIntegrationTest {
    @Autowired AdBookingService bookings;
    @Autowired JdbcTemplate jdbc;
    @Autowired ApplicationEventPublisher events;

    String run;
    String emailA;
    String emailB;
    long userA;
    long userB;
    long exclusiveSlot;
    long rotatingSlot;
    final LocalDate start = LocalDate.now(AdBookingService.VIETNAM).plusDays(10);

    @BeforeEach
    void fixtures() {
        run = UUID.randomUUID().toString().substring(0, 8);
        emailA = "adv-a-" + run + "@it.test";
        emailB = "adv-b-" + run + "@it.test";
        userA = advertiser(emailA, "VERIFIED");
        userB = advertiser(emailB, "VERIFIED");
        exclusiveSlot = slot("EXCLUSIVE", 1);
        rotatingSlot = slot("ROTATING", 2);
    }

    @AfterEach
    void clearAuth() {
        SecurityContextHolder.clearContext();
    }

    long advertiser(String email, String verification) {
        jdbc.update("INSERT INTO users (email, password_hash, full_name, role) VALUES (?, 'x', 'IT', 'ADVERTISER')", email);
        long userId = jdbc.queryForObject("SELECT user_id FROM users WHERE email = ?", Long.class, email);
        jdbc.update("INSERT INTO advertisers (user_id, company_name, tax_code, contact_person, email, phone, verification_status) " +
                "VALUES (?, 'IT Co', ?, 'IT', ?, '0900000000', ?)", userId, "TX" + userId + run, email, verification);
        return userId;
    }

    long slot(String mode, int capacity) {
        String code = "IT-" + mode + "-" + run;
        jdbc.update("INSERT INTO ad_slots (slot_code, name, page_location, dimensions, capacity, inventory_mode, base_price, pricing_type) " +
                "VALUES (?, ?, ?, '728x90', ?, ?, 100000, 'CPD')", code, code, code, capacity, mode);
        return jdbc.queryForObject("SELECT slot_id FROM ad_slots WHERE slot_code = ?", Long.class, code);
    }

    AdBookingService.Booking book(String email, long slotId, LocalDate from, LocalDate to) {
        return bookings.createBooking(email, input(UUID.randomUUID().toString(), slotId, from, to));
    }

    AdBookingService.BookingInput input(String key, long slotId, LocalDate from, LocalDate to) {
        return new AdBookingService.BookingInput(key, "IT campaign", slotId, from, to, "IT", "0900000000", "it@it.test");
    }

    void quote(String id, int version, long amount) {
        jdbc.update("UPDATE ad_campaigns SET quote_version = ?, quoted_amount = ? WHERE campaign_id = ?", version, amount, Long.parseLong(id));
    }

    String paymentStatus(String id) {
        return jdbc.queryForObject("SELECT payment_status FROM ad_campaigns WHERE campaign_id = ?", String.class, Long.parseLong(id));
    }

    void paid(String id, long amount, Long user) {
        events.publishEvent(PaymentSuccessEvent.builder().transactionId(1L).userId(user).transactionType("AD")
                .targetId(Long.parseLong(id)).amount(BigDecimal.valueOf(amount)).paidAt(LocalDateTime.now()).build());
    }

    @Test
    void concurrentBookingsOnExclusiveSlotOnlyOneWins() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<Boolean>> results = new ArrayList<>();
        for (String email : List.of(emailA, emailB)) {
            Callable<Boolean> attempt = () -> {
                go.await();
                try {
                    book(email, exclusiveSlot, start, start.plusDays(2));
                    return true;
                } catch (ResponseStatusException e) {
                    return false;
                }
            };
            results.add(pool.submit(attempt));
        }
        go.countDown();
        int wins = 0;
        for (Future<Boolean> r : results) wins += r.get() ? 1 : 0;
        pool.shutdown();
        assertEquals(1, wins);
        // Giao nhau ở ngày cuối cũng bị chặn; ngày sau đó thì trống.
        assertThrows(ResponseStatusException.class, () -> book(emailA, exclusiveSlot, start.plusDays(2), start.plusDays(4)));
        book(emailA, exclusiveSlot, start.plusDays(3), start.plusDays(4));
    }

    @Test
    void rotatingSlotCapacityIsCheckedPerDay() {
        book(emailA, rotatingSlot, start, start.plusDays(2));
        book(emailB, rotatingSlot, start.plusDays(2), start.plusDays(4));
        assertThrows(ResponseStatusException.class, () -> book(emailA, rotatingSlot, start.plusDays(1), start.plusDays(3)));
        book(emailA, rotatingSlot, start.plusDays(3), start.plusDays(5));
    }

    @Test
    void sameRequestKeyDoesNotCreateSecondBooking() {
        String key = UUID.randomUUID().toString();
        var first = bookings.createBooking(emailA, input(key, rotatingSlot, start, start));
        var again = bookings.createBooking(emailA, input(key, rotatingSlot, start, start));
        assertEquals(first.id(), again.id());
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM ad_campaigns WHERE request_key = ?", Integer.class, key));
    }

    @Test
    void otherAdvertiserIsForbiddenAndUnverifiedCannotBook() {
        var booking = book(emailA, rotatingSlot, start, start);
        var denied = assertThrows(ResponseStatusException.class, () -> bookings.booking(emailB, Long.parseLong(booking.id())));
        assertEquals(403, denied.getStatusCode().value());
        String pending = "adv-p-" + run + "@it.test";
        advertiser(pending, "PENDING");
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> book(pending, rotatingSlot, start, start)).getStatusCode().value());
    }

    @Test
    void quotationMustMatchCurrentVersionAndAcceptanceIsIdempotent() {
        var booking = book(emailA, exclusiveSlot, start, start);
        long id = Long.parseLong(booking.id());
        assertThrows(ResponseStatusException.class, () -> bookings.acceptQuotation(emailA, id, 1, true));
        quote(booking.id(), 2, 500000);
        assertThrows(ResponseStatusException.class, () -> bookings.acceptQuotation(emailA, id, 1, true));
        assertThrows(ResponseStatusException.class, () -> bookings.acceptQuotation(emailA, id, 2, false));
        var accepted = bookings.acceptQuotation(emailA, id, 2, true);
        assertEquals("CONFIRMED", accepted.bookingStatus());
        assertEquals(0, new BigDecimal("500000").compareTo(accepted.finalPrice()));
        // Tòa soạn sửa giá sau khi chốt không đổi snapshot đã xác nhận.
        quote(booking.id(), 2, 900000);
        assertEquals(0, new BigDecimal("500000").compareTo(bookings.acceptQuotation(emailA, id, 2, true).finalPrice()));
    }

    @Test
    void paymentEventIsCheckedAndRecordedOnce() {
        var booking = book(emailA, exclusiveSlot, start, start);
        quote(booking.id(), 1, 500000);
        bookings.acceptQuotation(emailA, Long.parseLong(booking.id()), 1, true);
        paid(booking.id(), 400000, userA);
        assertEquals("UNPAID", paymentStatus(booking.id()));
        paid(booking.id(), 500000, userB);
        assertEquals("UNPAID", paymentStatus(booking.id()));
        paid(booking.id(), 500000, userA);
        paid(booking.id(), 500000, userA);
        assertEquals("PAID", paymentStatus(booking.id()));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE target_type = 'AD_CAMPAIGN' " +
                "AND target_id = ? AND action = 'AD_PAYMENT_CONFIRMED'", Integer.class, Long.parseLong(booking.id())));
    }

    @Test
    void latePaymentAfterSlotWasRebookedIsFlaggedNotOverbooked() {
        var late = book(emailA, exclusiveSlot, start, start);
        quote(late.id(), 1, 500000);
        bookings.acceptQuotation(emailA, Long.parseLong(late.id()), 1, true);
        jdbc.update("UPDATE ad_campaigns SET hold_expires_at = NOW() - INTERVAL 1 MINUTE WHERE campaign_id = ?", Long.parseLong(late.id()));
        var other = book(emailB, exclusiveSlot, start, start);
        paid(late.id(), 500000, userA);
        var result = jdbc.queryForMap("SELECT payment_status, payment_issue FROM ad_campaigns WHERE campaign_id = ?", Long.parseLong(late.id()));
        assertEquals("PAID", result.get("payment_status"));
        assertEquals("LATE_PAYMENT_CONFLICT", result.get("payment_issue"));
        assertNull(jdbc.queryForObject("SELECT payment_issue FROM ad_campaigns WHERE campaign_id = ?", String.class, Long.parseLong(other.id())));
        assertEquals(List.of(start), bookings.availability(exclusiveSlot, start, start).fullDates());
    }

    @Test
    void paymentOrderUsesAcceptedAmountAndIsReused() {
        var booking = book(emailA, rotatingSlot, start, start);
        quote(booking.id(), 1, 750000);
        bookings.acceptQuotation(emailA, Long.parseLong(booking.id()), 1, true);
        SecurityContextHolder.getContext().setAuthentication(new TestingAuthenticationToken(emailA, null, "ROLE_ADVERTISER"));
        OrderCreateResponse first = bookings.createPayment(emailA, Long.parseLong(booking.id()));
        OrderCreateResponse second = bookings.createPayment(emailA, Long.parseLong(booking.id()));
        assertEquals(first.getOrderCode(), second.getOrderCode());
        assertEquals(0, new BigDecimal("750000").compareTo(first.getAmount()));
        assertEquals("PENDING", paymentStatus(booking.id()));
    }
}
