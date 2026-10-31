package com.localpress.identity;

import com.localpress.identity.service.VnPhone;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class VnPhoneTest {

    @Test
    void blankBecomesNull() {
        assertNull(VnPhone.normalizeOrNull("  "));
        assertNull(VnPhone.normalizeOrNull(null));
    }

    @Test
    void mobileAndCountryCodeBecomeLocal() {
        assertEquals("0912345678", VnPhone.normalizeOrNull("0912 345 678"));
        assertEquals("0912345678", VnPhone.normalizeOrNull("+84912345678"));
        assertEquals("02253842123", VnPhone.normalizeOrNull("0225.384.2123"));
    }

    @Test
    void invalidPhoneIs400() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> VnPhone.normalizeOrNull("12345"));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
    }
}
