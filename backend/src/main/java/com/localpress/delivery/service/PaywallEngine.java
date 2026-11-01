package com.localpress.delivery.service;

import com.localpress.delivery.repository.ContentAccessRepository;
import com.localpress.delivery.repository.ContentAccessRepository.PublishedArticle;
import com.localpress.identity.entity.User;
import com.localpress.administration.service.PaywallPolicyService;
import com.localpress.identity.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
@Transactional(readOnly = true)
public class PaywallEngine {
    private final ContentAccessRepository access;
    private final UserRepository users;
    private final Clock clock;
    private final PaywallPolicyService policies;

    public enum Reason { FREE, ARTICLE_PURCHASE, SUBSCRIPTION, LOGIN_REQUIRED, NO_ENTITLEMENT, ACCOUNT_UNAVAILABLE }
    public record Decision(boolean allowed, Reason reason) {}

    @Autowired
    public PaywallEngine(ContentAccessRepository access, UserRepository users, PaywallPolicyService policies) {
        this(access, users, Clock.system(ZoneId.of("Asia/Ho_Chi_Minh")), policies);
    }

    PaywallEngine(ContentAccessRepository access, UserRepository users, Clock clock) {
        this(access, users, clock, null);
    }

    private PaywallEngine(ContentAccessRepository access, UserRepository users, Clock clock, PaywallPolicyService policies) {
        this.access = access;
        this.users = users;
        this.clock = clock;
        this.policies = policies;
    }

    public int previewWordLimit() {return policies == null ? 120 : policies.read().previewWordLimit();}

    /**
     * Reader integration for locked plain-text content. Returns at most 30% of
     * the input and also respects the configured preview word cap.
     * This does not grant access or query caller identity.
     */
    public String buildLockedPreview(String rawContent) {
        if (rawContent == null || rawContent.isEmpty()) return "";
        int cut = (int) Math.floor(rawContent.length() * 0.3d);
        if (cut <= 0) return "";
        int lastBreak = Math.max(rawContent.lastIndexOf(' ', cut), rawContent.lastIndexOf('\n', cut));
        if (lastBreak > cut / 2) cut = lastBreak;
        if (cut > 0 && Character.isHighSurrogate(rawContent.charAt(cut - 1))
                && Character.isLowSurrogate(rawContent.charAt(cut))) cut--;
        String preview = rawContent.substring(0, cut);
        int limit = Math.max(1, Math.min(500, previewWordLimit()));
        var words = java.util.regex.Pattern.compile("\\S+", java.util.regex.Pattern.UNICODE_CHARACTER_CLASS)
                .matcher(preview);
        int count = 0;
        while (words.find()) {
            if (++count > limit) return preview.substring(0, words.start()).stripTrailing();
        }
        return preview.stripTrailing();
    }

    /** Trusted service contract; never accept userId from reader query parameters. */
    public Decision checkAccess(Long userId, Long articleId) {
        PublishedArticle article = published(articleId);
        if ("FREE".equals(article.accessType())) return new Decision(true, Reason.FREE);
        User user = userId == null ? null : users.findById(userId).orElse(null);
        return premiumAccess(user, article);
    }

    /** Both JWT and HTTP Basic supply the verified email through Spring Security. */
    public Decision checkCurrentAccess(Long articleId) {
        PublishedArticle article = published(articleId);
        if ("FREE".equals(article.accessType())) return new Decision(true, Reason.FREE);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                ? null : users.findByEmail(authentication.getName()).orElse(null);
        return premiumAccess(user, article);
    }

    private PublishedArticle published(Long articleId) {
        return access.findPublishedArticle(articleId).orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Không tìm thấy bài viết hoặc bài chưa được xuất bản"));
    }

    private Decision premiumAccess(User user, PublishedArticle article) {
        if (user == null) return new Decision(false, Reason.LOGIN_REQUIRED);
        if (user.getStatus() != User.Status.ACTIVE || (user.getLockedUntil() != null
                && user.getLockedUntil().isAfter(LocalDateTime.now(clock)))) {
            return new Decision(false, Reason.ACCOUNT_UNAVAILABLE);
        }
        if (access.hasActivePurchase(user.getId(), article.id())) {
            return new Decision(true, Reason.ARTICLE_PURCHASE);
        }
        LocalDate today = LocalDate.now(clock);
        if (access.findSubscriptions(user.getId()).stream()
                .anyMatch(grant -> grant.covers(article.categoryId(), today))) {
            return new Decision(true, Reason.SUBSCRIPTION);
        }
        return new Decision(false, Reason.NO_ENTITLEMENT);
    }
}
