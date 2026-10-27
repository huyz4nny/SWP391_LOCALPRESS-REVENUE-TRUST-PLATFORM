package com.localpress.delivery.service;

import com.localpress.delivery.repository.ContentAccessRepository;
import com.localpress.delivery.repository.ContentAccessRepository.PublishedArticle;
import com.localpress.delivery.repository.ContentAccessRepository.SubscriptionGrant;
import com.localpress.identity.entity.User;
import com.localpress.identity.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.Arguments;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.*;
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaywallEngineTest {
    @Mock ContentAccessRepository access;
    @Mock UserRepository users;
    PaywallEngine engine;
    static final LocalDate TODAY = LocalDate.of(2026, 10, 26);

    @BeforeEach void setup() {
        // UTC is still October 25; subscription dates must follow Vietnam's October 26.
        engine = new PaywallEngine(access, users, Clock.fixed(
                Instant.parse("2026-10-25T18:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh")));
        SecurityContextHolder.clearContext();
    }

    @AfterEach void cleanup() { SecurityContextHolder.clearContext(); }

    User user() {
        User user = User.createReader("Reader", "reader@example.test", "unused", null);
        ReflectionTestUtils.setField(user, "id", 6L);
        return user;
    }

    void premium() {
        when(access.findPublishedArticle(1L)).thenReturn(Optional.of(new PublishedArticle(1L, 2L, "PREMIUM")));
    }

    @Test void guestReadsFreeWithoutIdentityOrEntitlementLookup() {
        when(access.findPublishedArticle(3L)).thenReturn(Optional.of(new PublishedArticle(3L, 2L, "FREE")));
        assertEquals(new PaywallEngine.Decision(true, PaywallEngine.Reason.FREE), engine.checkCurrentAccess(3L));
        verifyNoInteractions(users);
        verify(access, never()).hasActivePurchase(any(), any());
        verify(access, never()).findSubscriptions(any());
    }

    @Test void anonymousAuthenticationNeverBecomesAnEntitledUser() {
        premium();
        SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken(
                "anonymous", "anonymousUser", List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
        assertEquals(PaywallEngine.Reason.LOGIN_REQUIRED, engine.checkCurrentAccess(1L).reason());
        verifyNoInteractions(users);
    }

    @Test void noAuthenticationAndNoUserIdBothGetPreview() {
        premium();
        assertFalse(engine.checkCurrentAccess(1L).allowed());
        assertFalse(engine.checkAccess(null, 1L).allowed());
        verifyNoInteractions(users);
    }

    @Test void verifiedPrincipalUsesDatabaseUserIdentity() {
        premium();
        SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                "reader@example.test", null, List.of(new SimpleGrantedAuthority("ROLE_READER"))));
        when(users.findByEmail("reader@example.test")).thenReturn(Optional.of(user()));
        when(access.hasActivePurchase(6L, 1L)).thenReturn(true);
        assertEquals(PaywallEngine.Reason.ARTICLE_PURCHASE, engine.checkCurrentAccess(1L).reason());
        verify(access, never()).findSubscriptions(any());
    }

    @Test void activePurchaseUnlocksOnlyItsArticleAndOwner() {
        premium();
        when(users.findById(6L)).thenReturn(Optional.of(user()));
        when(access.hasActivePurchase(6L, 1L)).thenReturn(true);
        assertTrue(engine.checkAccess(6L, 1L).allowed());
        verify(access).hasActivePurchase(6L, 1L);
        verify(access, never()).findSubscriptions(any());
    }

    @Test void missingUserCannotUseOldPurchaseRights() {
        premium();
        assertFalse(engine.checkAccess(404L, 1L).allowed());
        verify(access, never()).hasActivePurchase(any(), any());
    }

    @Test void lockedAccountCannotUseItsEntitlements() {
        premium();
        User user = user();
        ReflectionTestUtils.setField(user, "status", User.Status.LOCKED);
        when(users.findById(6L)).thenReturn(Optional.of(user));
        assertEquals(PaywallEngine.Reason.ACCOUNT_UNAVAILABLE, engine.checkAccess(6L, 1L).reason());
        verify(access, never()).hasActivePurchase(any(), any());
    }

    @Test void temporarilyLockedAccountCannotUseItsEntitlements() {
        premium();
        User user = user();
        ReflectionTestUtils.setField(user, "lockedUntil", LocalDateTime.of(2026, 10, 26, 2, 0));
        when(users.findById(6L)).thenReturn(Optional.of(user));
        assertFalse(engine.checkAccess(6L, 1L).allowed());
        verify(access, never()).hasActivePurchase(any(), any());
    }

    @Test void administratorRoleDoesNotBypassPremiumRights() {
        premium();
        User user = user();
        ReflectionTestUtils.setField(user, "role", User.Role.SYSTEM_ADMIN);
        when(users.findById(6L)).thenReturn(Optional.of(user));
        assertEquals(PaywallEngine.Reason.NO_ENTITLEMENT, engine.checkAccess(6L, 1L).reason());
    }

    static Stream<Arguments> subscriptions() {
        return Stream.of(
                Arguments.of("ACTIVE", TODAY, TODAY, "ALL", null, true),
                Arguments.of("ACTIVE", TODAY, TODAY, "CATEGORY", 2L, true),
                Arguments.of("ACTIVE", TODAY.minusDays(2), TODAY.plusDays(1), "CATEGORY", 2L, true),
                Arguments.of("ACTIVE", TODAY, TODAY, "CATEGORY", 3L, false),
                Arguments.of("ACTIVE", TODAY, TODAY, "CATEGORY", null, false),
                Arguments.of("ACTIVE", TODAY, TODAY, "ALL", 2L, false),
                Arguments.of("ACTIVE", TODAY, TODAY, "UNKNOWN", null, false),
                Arguments.of("PENDING", TODAY, TODAY, "ALL", null, false),
                Arguments.of("CANCELLED", TODAY, TODAY, "ALL", null, false),
                Arguments.of("EXPIRED", TODAY, TODAY, "ALL", null, false),
                Arguments.of("ACTIVE", TODAY.minusDays(3), TODAY.minusDays(1), "ALL", null, false),
                Arguments.of("ACTIVE", TODAY.plusDays(1), TODAY.plusDays(3), "ALL", null, false)
        );
    }

    @ParameterizedTest @MethodSource("subscriptions")
    void subscriptionsRespectStatusDatesAndScope(String status, LocalDate start, LocalDate end,
                                                 String scope, Long categoryId, boolean allowed) {
        premium();
        when(users.findById(6L)).thenReturn(Optional.of(user()));
        when(access.findSubscriptions(6L)).thenReturn(List.of(new SubscriptionGrant(status, start, end, scope, categoryId)));
        var decision = engine.checkAccess(6L, 1L);
        assertEquals(allowed, decision.allowed());
        assertEquals(allowed ? PaywallEngine.Reason.SUBSCRIPTION : PaywallEngine.Reason.NO_ENTITLEMENT, decision.reason());
    }

    @Test void anyValidSubscriptionCanGrantAccessWhenAnotherExpired() {
        premium();
        when(users.findById(6L)).thenReturn(Optional.of(user()));
        when(access.findSubscriptions(6L)).thenReturn(List.of(
                new SubscriptionGrant("ACTIVE", TODAY.minusDays(3), TODAY.minusDays(1), "ALL", null),
                new SubscriptionGrant("ACTIVE", TODAY, TODAY, "CATEGORY", 2L)));
        assertTrue(engine.checkAccess(6L, 1L).allowed());
    }

    @Test void unpublishedArticleIsNotUnlockedByHavingAUserId() {
        var error = assertThrows(ResponseStatusException.class, () -> engine.checkAccess(6L, 99L));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
        verifyNoInteractions(users);
    }
}
