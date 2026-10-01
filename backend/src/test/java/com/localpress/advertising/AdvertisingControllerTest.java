package com.localpress.advertising;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.core.Authentication;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdvertisingControllerTest {
    @Test
    void profileIsSelectedByAuthenticatedEmail() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        Authentication auth = mock(Authentication.class);
        var profile = new AdvertisingController.Profile("1", "Company A", "123", "Owner",
                "owner@example.com", "0900000000", "", "", "Logistics", "Company A",
                "123", "Address", "billing@example.com", "VERIFIED");
        when(auth.getName()).thenReturn("owner@example.com");
        when(jdbc.query(any(String.class), any(RowMapper.class), eq("owner@example.com")))
                .thenReturn(List.of(profile));

        assertEquals("Company A", new AdvertisingController(jdbc, new ObjectMapper()).profile(auth).companyName());
        verify(jdbc).query(contains("u.email = ?"), any(RowMapper.class), eq("owner@example.com"));
    }

    @Test
    void historyIsSelectedByAuthenticatedAdvertiser() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn("owner@example.com");
        new AdvertisingController(jdbc, new ObjectMapper()).profileHistory(auth);
        verify(jdbc).query(contains("u.email = ? AND u.role = 'ADVERTISER'"),
                any(RowMapper.class), eq("owner@example.com"));
    }
}
