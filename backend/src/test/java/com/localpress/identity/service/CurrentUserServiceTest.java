package com.localpress.identity.service;

import com.localpress.identity.entity.User;
import com.localpress.identity.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CurrentUserServiceTest {
    private static final String EMAIL = "editor@example.test";

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CurrentUserService currentUserService;

    @BeforeEach
    void authenticate() {
        SecurityContextHolder.clearContext();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(EMAIL, "unused",
                        List.of(new SimpleGrantedAuthority("ROLE_EDITOR"))));
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void activeEditorCanUseCms() {
        User editor = editor();
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(editor));

        assertSame(editor, currentUserService.requireCurrentEditor());
    }

    @Test
    void readerCannotUseCmsEvenWithEditorAuthorityInContext() {
        User reader = User.createReader("Reader", EMAIL, "unused", null);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(reader));

        assertForbidden();
    }

    @Test
    void lockedEditorCannotUseCms() {
        User editor = editor();
        ReflectionTestUtils.setField(editor, "status", User.Status.LOCKED);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(editor));

        assertForbidden();
    }

    @Test
    void temporarilyLockedEditorCannotUseCms() {
        User editor = editor();
        ReflectionTestUtils.setField(editor, "lockedUntil", LocalDateTime.now().plusHours(1));
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(editor));

        assertForbidden();
    }

    @Test
    void anonymousRequestIsRejectedBeforeReadingUser() {
        SecurityContextHolder.getContext().setAuthentication(
                new AnonymousAuthenticationToken("test", "anonymousUser",
                        List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))));

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class, currentUserService::requireCurrentEditor);
        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
        verifyNoInteractions(userRepository);
    }

    private User editor() {
        User user = User.createReader("Editor", EMAIL, "unused", null);
        ReflectionTestUtils.setField(user, "role", User.Role.EDITOR);
        return user;
    }

    private void assertForbidden() {
        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class, currentUserService::requireCurrentEditor);
        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }
}
