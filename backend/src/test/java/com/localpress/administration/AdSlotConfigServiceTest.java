package com.localpress.administration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpress.administration.repository.AdSlotConfigRepository;
import com.localpress.administration.repository.AdSlotConfigRepository.*;
import com.localpress.administration.service.*;
import com.localpress.identity.entity.User;
import org.junit.jupiter.api.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdSlotConfigServiceTest {
    final AdminAccess access = mock(AdminAccess.class);
    final AdSlotConfigRepository repo = mock(AdSlotConfigRepository.class);
    final AdSlotConfigService service = new AdSlotConfigService(access, repo, new ObjectMapper());
    final LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    Slot slot = new Slot(7,"TOP","Top","HOME","ALL","728x90",3,"ROTATING",new BigDecimal("100.00"),"CPD","ACTIVE",null);
    @BeforeEach void setup() {
        var actor = User.createReader("Admin","admin@test","unused",null);
        ReflectionTestUtils.setField(actor,"id",1L);
        when(access.requireAdmin(null)).thenReturn(actor);
        when(repo.list()).thenAnswer(call -> List.of(slot));
        when(repo.lock(7)).thenAnswer(call -> Optional.of(slot));
    }
    AdSlotConfigService.Input input(int capacity, String status) {
        return new AdSlotConfigService.Input("Top",new BigDecimal("100.00"),capacity,status,service.list(null).get(0).revision());
    }
    @Test void nonAdminCannotReadOrWriteRepository() {
        when(access.requireAdmin(null)).thenThrow(new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN));
        assertThrows(ResponseStatusException.class, () -> service.list(null));
        assertThrows(ResponseStatusException.class, () -> service.update(null,7,null,"ip"));
        verifyNoInteractions(repo);
    }
    @Test void staleFormCannotOverwrite() {
        var request = input(2,"ACTIVE");
        slot = new Slot(7,"TOP","Changed","HOME","ALL","728x90",3,"ROTATING",new BigDecimal("100.00"),"CPD","ACTIVE",null);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.update(null,7,request,"ip")).getStatusCode().value());
        verify(repo,never()).update(anyLong(),anyString(),any(),anyInt(),anyString());
    }
    @Test void missingSlotReturns404() {
        var request = input(2,"ACTIVE"); when(repo.lock(7)).thenReturn(Optional.empty());
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.update(null,7,request,"ip")).getStatusCode().value());
    }
    @Test void unchangedFormDoesNotWriteOrAudit() {
        service.update(null,7,input(3,"ACTIVE"),"ip");
        verify(repo,never()).update(anyLong(),anyString(),any(),anyInt(),anyString());
        verify(repo,never()).audit(anyLong(),anyLong(),anyString(),anyString(),anyString());
    }
    @Test void exclusiveCapacityMustStayOne() {
        slot = new Slot(7,"TOP","Top","HOME","ALL","728x90",1,"EXCLUSIVE",new BigDecimal("100.00"),"CPD","ACTIVE",null);
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.update(null,7,input(2,"ACTIVE"),"ip")).getStatusCode().value());
    }
    @Test void overlappingBookingsPreventCapacityReduction() {
        when(repo.reservations(7,today)).thenReturn(List.of(new Reservation(today,today.plusDays(2)),new Reservation(today.plusDays(2),today.plusDays(5))));
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.update(null,7,input(1,"ACTIVE"),"ip")).getStatusCode().value());
        verify(repo,never()).update(anyLong(),anyString(),any(),anyInt(),anyString());
    }
    @Test void nonOverlappingBookingsAllowReductionAndWriteAuditAfterUpdate() {
        when(repo.reservations(7,today)).thenReturn(List.of(new Reservation(today,today.plusDays(1)),new Reservation(today.plusDays(2),today.plusDays(5))));
        var result = service.update(null,7,input(1,"ACTIVE"),"ip"); assertEquals(1,result.capacity());
        var order = inOrder(repo);
        order.verify(repo).lock(7); order.verify(repo).reservations(7,today);
        order.verify(repo).update(7,"Top",new BigDecimal("100.00"),1,"ACTIVE");
        order.verify(repo).audit(eq(1L),eq(7L),contains("\"capacity\":3"),contains("\"capacity\":1"),eq("ip"));
    }
    @Test void futureBookingPreventsDeactivation() {
        when(repo.reservations(7,today)).thenReturn(List.of(new Reservation(today.plusYears(1),today.plusYears(1))));
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.update(null,7,input(3,"INACTIVE"),"ip")).getStatusCode().value());
    }
    @Test void emptyCalendarAllowsDeactivation() {
        assertEquals("INACTIVE",service.update(null,7,input(3,"INACTIVE"),"ip").status());
        verify(repo).audit(eq(1L),eq(7L),anyString(),contains("INACTIVE"),eq("ip"));
    }
    @Test void priceAndNameChangeDoNotAlterCampaignsOrNeedCalendarRead() {
        var request = new AdSlotConfigService.Input(" New name ",new BigDecimal("250.50"),3,"ACTIVE",service.list(null).get(0).revision());
        var result = service.update(null,7,request,"ip");
        assertEquals("New name",result.name()); assertEquals(new BigDecimal("250.50"),result.basePrice());
        verify(repo,never()).reservations(anyLong(),any());
        verify(repo).update(7,"New name",new BigDecimal("250.50"),3,"ACTIVE");
    }
    @Test void pastDatesDoNotOccupyFutureCalendar() {
        assertEquals(1,AdSlotConfigService.peak(List.of(new Reservation(today.minusDays(3),today.minusDays(1)),new Reservation(today,today)),today));
    }
}
