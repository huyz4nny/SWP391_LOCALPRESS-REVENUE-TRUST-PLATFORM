package com.localpress.delivery.service;

import com.localpress.administration.service.PaywallPolicyService;
import com.localpress.delivery.repository.ContentAccessRepository;
import com.localpress.identity.repository.UserRepository;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PaywallPreviewTest {
    @Test void capsWordsWithoutExceedingThirtyPercentOfContent() {
        var policies = mock(PaywallPolicyService.class);
        when(policies.read()).thenReturn(new PaywallPolicyService.Settings(2, 2, true, 15000, false, null, null));
        var access = mock(ContentAccessRepository.class);
        var users = mock(UserRepository.class);
        var engine = new PaywallEngine(access, users, policies);
        String full = "Một hai ba bốn năm sáu bảy tám chín mười ".repeat(10);
        assertEquals("Một hai", engine.buildLockedPreview(full));
        assertTrue(engine.buildLockedPreview(full).length() <= Math.floor(full.length() * .3));
        verifyNoInteractions(access, users);
    }

    @Test void defaultsStillRespectThirtyPercentAndWordBoundaries() {
        var engine = new PaywallEngine(mock(ContentAccessRepository.class), mock(UserRepository.class), java.time.Clock.systemUTC());
        String full = "one two three four five six seven eight nine ten";
        String preview = engine.buildLockedPreview(full);
        assertTrue(preview.length() <= Math.floor(full.length() * .3));
        assertFalse(preview.equals(full));
        assertFalse(preview.endsWith(" "));
    }

    @Test void emptyAndTinyContentNeverExposeTheWholeArticleOrSplitAnEmoji() {
        var engine = new PaywallEngine(mock(ContentAccessRepository.class), mock(UserRepository.class), java.time.Clock.systemUTC());
        assertEquals("", engine.buildLockedPreview(null));
        assertEquals("", engine.buildLockedPreview(""));
        assertEquals("", engine.buildLockedPreview("ab"));
        assertEquals("", engine.buildLockedPreview("😀abcd"));
    }
}
