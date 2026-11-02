package com.localpress.administration;

import com.localpress.administration.service.AdminAccess;
import com.localpress.identity.entity.User;
import com.localpress.identity.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminAccessTest {
    @ParameterizedTest @EnumSource(value=User.Role.class,names="SYSTEM_ADMIN",mode=EnumSource.Mode.EXCLUDE)
    void nonAdminCannotAccessAdministrationEvenWithForgedAuthorities(User.Role role) {
        var users=mock(UserRepository.class);
        User user=User.createReader("Reader","reader@example.test","unused",null);
        ReflectionTestUtils.setField(user,"role",role);
        when(users.findByEmail("reader@example.test")).thenReturn(Optional.of(user));
        var auth=UsernamePasswordAuthenticationToken.authenticated("reader@example.test",null,List.of());
        assertEquals(403,assertThrows(ResponseStatusException.class,()->new AdminAccess(users).requireAdmin(auth)).getStatusCode().value());
    }
    @Test void guestRequiresAuthentication() {
        assertEquals(401,assertThrows(ResponseStatusException.class,()->new AdminAccess(mock(UserRepository.class)).requireAdmin(null)).getStatusCode().value());
    }
    @Test void activeAdministratorIsAccepted() {
        var users=mock(UserRepository.class);
        User user=User.createReader("Admin","admin@example.test","unused",null);
        ReflectionTestUtils.setField(user,"role",User.Role.SYSTEM_ADMIN);
        when(users.findByEmail("admin@example.test")).thenReturn(Optional.of(user));
        assertSame(user,new AdminAccess(users).requireAdmin(UsernamePasswordAuthenticationToken.authenticated("admin@example.test",null,List.of())));
    }
}
