package com.localpress.advertising;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class AdvertisingController {
    private final JdbcTemplate jdbc;

    public AdvertisingController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Slot(String id, String code, String name, String dimensions,
                       BigDecimal pricePerDay, String pricingType, String deviceType,
                       String locationNote, int maxCapacity, boolean isActive) {}

    public record Profile(String id, String companyName, String taxCode, String contactPerson,
                          String email, String phone, String address, String businessLicenseUrl,
                          String verificationStatus) {}

    public record ProfileInput(@NotBlank @Size(max = 255) String companyName,
                               @NotBlank @Size(max = 50) String taxCode,
                               @NotBlank @Size(max = 150) String contactPerson,
                               @NotBlank @Email @Size(max = 255) String email,
                               @NotBlank @Size(max = 20) String phone,
                               @Size(max = 500) String address,
                               @Size(max = 1000) @Pattern(regexp = "^$|https?://.+") String businessLicenseUrl) {}

    public record AdvertiserIdentity(String id, String name, String email, String phone,
                                     String role, String companyId, String companyName,
                                     boolean isActive) {}

    @GetMapping("/advertiser/me")
    public AdvertiserIdentity me(Authentication auth) {
        return jdbc.query("SELECT u.user_id, u.full_name, u.email, u.phone, u.role, u.status, " +
                        "a.advertiser_id, a.company_name FROM users u LEFT JOIN advertisers a ON a.user_id = u.user_id " +
                        "WHERE u.email = ? AND u.role = 'ADVERTISER' AND u.status = 'ACTIVE'",
                (rs, row) -> new AdvertiserIdentity(String.valueOf(rs.getLong("user_id")),
                        rs.getString("full_name"), rs.getString("email"), rs.getString("phone"),
                        rs.getString("role"), rs.getString("advertiser_id"), rs.getString("company_name"), true),
                auth.getName()).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
    }

    @GetMapping("/ad-slots")
    public List<Slot> slots() {
        return jdbc.query("SELECT slot_id, slot_code, name, dimensions, base_price, pricing_type, " +
                        "device_type, page_location, capacity FROM ad_slots WHERE status = 'ACTIVE' ORDER BY slot_id",
                (rs, row) -> new Slot(String.valueOf(rs.getLong("slot_id")), rs.getString("slot_code"),
                        rs.getString("name"), rs.getString("dimensions"), rs.getBigDecimal("base_price"),
                        rs.getString("pricing_type"), rs.getString("device_type"),
                        rs.getString("page_location"), rs.getInt("capacity"), true));
    }

    @GetMapping("/advertiser/profile")
    public Profile profile(Authentication auth) {
        return jdbc.query("SELECT a.* FROM advertisers a JOIN users u ON u.user_id = a.user_id " +
                        "WHERE u.email = ? AND u.role = 'ADVERTISER' AND u.status = 'ACTIVE'",
                (rs, row) -> new Profile(String.valueOf(rs.getLong("advertiser_id")),
                        rs.getString("company_name"), rs.getString("tax_code"), rs.getString("contact_person"),
                        rs.getString("email"), rs.getString("phone"), rs.getString("address"),
                        rs.getString("business_license_url"), rs.getString("verification_status")),
                auth.getName()).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not created"));
    }

    @PutMapping("/advertiser/profile")
    @Transactional
    public Profile saveProfile(Authentication auth, @Valid @RequestBody ProfileInput input) {
        Long userId = jdbc.query("SELECT user_id FROM users WHERE email = ? AND role = 'ADVERTISER' " +
                        "AND status = 'ACTIVE'", (rs, row) -> rs.getLong(1), auth.getName())
                .stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
        boolean exists = !jdbc.query("SELECT advertiser_id FROM advertisers WHERE user_id = ?",
                (rs, row) -> rs.getLong(1), userId).isEmpty();
        if (exists) {
            jdbc.update("UPDATE advertisers SET company_name = ?, tax_code = ?, contact_person = ?, email = ?, " +
                            "phone = ?, address = ?, business_license_url = ?, " +
                            "verification_status = CASE WHEN tax_code = ? AND " +
                            "COALESCE(business_license_url, '') = COALESCE(?, '') THEN verification_status " +
                            "ELSE 'PENDING' END WHERE user_id = ?",
                    input.companyName(), input.taxCode(), input.contactPerson(), input.email(), input.phone(),
                    input.address(), input.businessLicenseUrl(), input.taxCode(), input.businessLicenseUrl(), userId);
        } else {
            jdbc.update("INSERT INTO advertisers (user_id, company_name, tax_code, contact_person, email, phone, " +
                            "address, business_license_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    userId, input.companyName(), input.taxCode(), input.contactPerson(), input.email(),
                    input.phone(), input.address(), input.businessLicenseUrl());
        }
        return profile(auth);
    }

    @ExceptionHandler(DuplicateKeyException.class)
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CONFLICT)
    public Map<String, String> duplicateTaxCode() {
        return Map.of("message", "Mã số thuế đã được sử dụng");
    }
}
