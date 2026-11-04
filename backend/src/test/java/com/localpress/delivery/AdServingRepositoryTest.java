package com.localpress.delivery;

import com.localpress.delivery.repository.AdServingRepository;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.jdbc.core.JdbcTemplate;
import java.time.LocalDate;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

class AdServingRepositoryTest {
    @ParameterizedTest
    @ValueSource(ints = {0, 1})
    void clickAcknowledgesOnlyAnUpdatedRow(int rows) {
        var jdbc = mock(JdbcTemplate.class);
        var day = LocalDate.of(2026, 11, 3);
        when(jdbc.update(anyString(), eq(10L), eq(20L), eq(day))).thenReturn(rows);
        var repository = new AdServingRepository(jdbc);
        var creative = new AdServingRepository.Creative(10, 20, "Ad", "https://example.test/a.png", "https://example.test", "Test");
        assertEquals(rows == 1, repository.click(creative, day));
        verify(jdbc).update(contains("clicks<impressions"), eq(10L), eq(20L), eq(day));
    }
}
