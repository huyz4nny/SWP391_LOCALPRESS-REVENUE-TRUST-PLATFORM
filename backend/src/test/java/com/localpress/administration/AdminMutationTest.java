package com.localpress.administration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.administration.service.*;
import com.localpress.delivery.repository.AdServingRepository;
import com.localpress.identity.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminMutationTest {
    @Test void selfDemotionAndUnsupportedRolesAreRejectedBeforeWriting() {
        var access=mock(AdminAccess.class);
        var jdbc=mock(JdbcTemplate.class);
        var actor=User.createReader("Admin","admin@example.test","unused",null);
        ReflectionTestUtils.setField(actor,"id",1L);
        when(access.requireAdmin(null)).thenReturn(actor);
        var service=new AdministrationService(access,jdbc,new ObjectMapper(),mock(AdServingRepository.class),mock(PaywallPolicyService.class));
        assertEquals(409,assertThrows(ResponseStatusException.class,()->service.updateRole(null,1L,"READER","127.0.0.1")).getStatusCode().value());
        assertEquals(400,assertThrows(ResponseStatusException.class,()->service.updateRole(null,2L,"GUEST","127.0.0.1")).getStatusCode().value());
        verifyNoInteractions(jdbc);
    }
}
