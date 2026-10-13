package com.localpress.identity.service;

import com.localpress.identity.entity.User;
import com.localpress.identity.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
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

    @ParameterizedTest
    @EnumSource(value = User.Role.class, names = {"AUTHOR", "EDITOR", "SYSTEM_ADMIN"})
    void activeWritingRoleCanUseCms(User.Role role) {
        User user = editor();
        ReflectionTestUtils.setField(user, "role", role);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        assertSame(user, currentUserService.requireCurrentAuthor());
    }

    @ParameterizedTest
    @EnumSource(value = User.Role.class, names = {"READER", "STAFF", "ACCOUNTANT", "ADVERTISER"})
    void otherRoleCannotUseCmsEvenWithEditorAuthorityInContext(User.Role role) {
        User user = User.createReader("User", EMAIL, "unused", null);
        ReflectionTestUtils.setField(user, "role", role);
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

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
                ResponseStatusException.class, currentUserService::requireCurrentAuthor);
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
                ResponseStatusException.class, currentUserService::requireCurrentAuthor);
        assertEquals(HttpStatus.FORBIDDEN, exception.getStatusCode());
    }
}
