package com.localpress.administration;
import com.localpress.administration.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class AuditSearchTest {
 @Test void literalFiltersAreBoundAndWildcardsEscaped() {
  var q=AuditSearchService.query("a%_!", "' OR 1=1", "USER 2",null,null,123L);
  assertFalse(q.sql().contains("OR 1=1"));
  assertEquals("%a!%!_!!%",q.args().get(0));
  assertEquals(123L,q.args().get(3));
  assertTrue(q.sql().endsWith("ORDER BY l.audit_id DESC LIMIT 51"));
 }
 @Test void dateRangeIncludesEntireLastDay() {
  var day=LocalDate.of(2026,11,4);var q=AuditSearchService.query("","","",day,day,null);
  assertEquals(day.atStartOfDay(),q.args().get(0));assertEquals(day.plusDays(1).atStartOfDay(),q.args().get(1));
 }
 @Test void invalidFiltersRejected() {
  assertThrows(ResponseStatusException.class,()->AuditSearchService.query("x".repeat(121),null,null,null,null,null));
  assertThrows(ResponseStatusException.class,()->AuditSearchService.query(null,null,null,null,null,0L));
  assertThrows(ResponseStatusException.class,()->AuditSearchService.query(null,null,null,LocalDate.of(2026,11,5),LocalDate.of(2026,11,4),null));
 }
 @Test void accessCheckedBeforeDatabaseQuery() {
  var access=mock(AdminAccess.class);var jdbc=mock(JdbcTemplate.class);
  doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN)).when(access).requireAdmin(null);
  assertThrows(ResponseStatusException.class,()->new AuditSearchService(access,jdbc).search(null,null,null,null,null,null,null));verifyNoInteractions(jdbc);
 }
}
