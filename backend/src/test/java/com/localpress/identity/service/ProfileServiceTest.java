package com.localpress.identity.service;

import com.localpress.identity.dto.CurrentUserResponse;
import com.localpress.identity.repository.UserProfileRepository;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.sql.SQLException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProfileServiceTest {

    UserProfileRepository profiles = mock(UserProfileRepository.class);
    ProfileService service = new ProfileService(profiles);

    @Test
    void getCurrentReturnsActiveProfile() {
        CurrentUserResponse me = new CurrentUserResponse("7", "An", "an@test.vn", null, "READER", null, null, null, true);
        when(profiles.findActiveByEmail("an@test.vn")).thenReturn(Optional.of(me));

        assertSame(me, service.getCurrent("an@test.vn"));
    }

    @Test
    void getCurrentOfLockedOrMissingAccountIs404() {
        when(profiles.findActiveByEmail("an@test.vn")).thenReturn(Optional.empty());

        ResponseStatusException error = assertThrows(ResponseStatusException.class, () -> service.getCurrent("an@test.vn"));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
    }

    @Test
    void updateTrimsNameAndNormalizesPhone() {
        when(profiles.updateNameAndPhone(anyString(), anyString(), any())).thenReturn(1);

        service.update("an@test.vn", "  Nguyễn An  ", "+84 912 345 678");

        verify(profiles).updateNameAndPhone("an@test.vn", "Nguyễn An", "0912345678");
    }

    @Test
    void blankPhoneIsStoredAsNull() {
        when(profiles.updateNameAndPhone(anyString(), anyString(), any())).thenReturn(1);

        service.update("an@test.vn", "An", "  ");

        verify(profiles).updateNameAndPhone("an@test.vn", "An", null);
        verify(profiles, never()).isPhoneUsedByAnother(any(), any());
    }

    @Test
    void blankOrTooLongNameIsRejected() {
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.update("an@test.vn", "   ", null)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.update("an@test.vn", "a".repeat(151), null)).getStatusCode());
        verify(profiles, never()).updateNameAndPhone(any(), any(), any());
    }

    @Test
    void phoneOfAnotherAccountIsConflict() {
        when(profiles.isPhoneUsedByAnother("0912345678", "an@test.vn")).thenReturn(true);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.update("an@test.vn", "An", "0912345678"));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
        verify(profiles, never()).updateNameAndPhone(any(), any(), any());
    }

    @Test
    void noRowUpdatedIs404() {
        when(profiles.updateNameAndPhone(anyString(), anyString(), any())).thenReturn(0);

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.update("an@test.vn", "An", null));
        assertEquals(HttpStatus.NOT_FOUND, error.getStatusCode());
    }

    @Test
    void concurrentDuplicatePhoneIsConflict() {
        when(profiles.updateNameAndPhone(anyString(), anyString(), any())).thenThrow(
                new DataIntegrityViolationException("dup", new SQLException("Duplicate entry", "23000", 1062)));

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> service.update("an@test.vn", "An", "0912345678"));
        assertEquals(HttpStatus.CONFLICT, error.getStatusCode());
    }

    @Test
    void otherDatabaseErrorsAreNotHidden() {
        DataIntegrityViolationException other = new DataIntegrityViolationException("fk", new SQLException("fk", "23000", 1452));
        when(profiles.updateNameAndPhone(anyString(), anyString(), any())).thenThrow(other);

        assertSame(other, assertThrows(DataIntegrityViolationException.class,
                () -> service.update("an@test.vn", "An", null)));
    }
}
