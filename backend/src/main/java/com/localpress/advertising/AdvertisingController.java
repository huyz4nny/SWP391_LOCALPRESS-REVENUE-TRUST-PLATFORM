package com.localpress.advertising;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/v1")
public class AdvertisingController {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public AdvertisingController(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public record Slot(String id, String code, String name, String dimensions,
                       BigDecimal pricePerDay, String pricingType, String deviceType,
                       String locationNote, String categoryName, String inventoryMode,
                       int maxCapacity, boolean isActive) {}

    public record Profile(String id, String companyName, String taxCode, String contactPerson,
                          String email, String phone, String address, String businessLicenseUrl,
                          String businessSector, String invoiceName, String invoiceTaxCode,
                          String invoiceAddress, String invoiceEmail,
                          String verificationStatus) {}

    public record ProfileInput(@NotBlank @Size(max = 255) String companyName,
                               @NotBlank @Size(max = 50) String taxCode,
                               @NotBlank @Size(max = 150) String contactPerson,
                               @NotBlank @Email @Size(max = 255) String email,
                               @NotBlank @Size(max = 20) String phone,
                               @Size(max = 500) String address,
                               @Size(max = 1000) @Pattern(regexp = "^$|https?://.+") String businessLicenseUrl,
                               @NotBlank @Size(max = 150) String businessSector,
                               @NotBlank @Size(max = 255) String invoiceName,
                               @NotBlank @Size(max = 50) String invoiceTaxCode,
                               @NotBlank @Size(max = 500) String invoiceAddress,
                               @NotBlank @Email @Size(max = 255) String invoiceEmail) {}

    public record ProfileChange(String id, String action, JsonNode oldValue,
                                JsonNode newValue, LocalDateTime createdAt) {}

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
        return jdbc.query("SELECT s.slot_id, s.slot_code, s.name, s.dimensions, s.base_price, s.pricing_type, " +
                        "s.device_type, s.page_location, s.capacity, s.inventory_mode, c.name AS category_name " +
                        "FROM ad_slots s LEFT JOIN categories c ON c.category_id = s.category_id " +
                        "WHERE s.status = 'ACTIVE' ORDER BY s.slot_id",
                (rs, row) -> new Slot(String.valueOf(rs.getLong("slot_id")), rs.getString("slot_code"),
                        rs.getString("name"), rs.getString("dimensions"), rs.getBigDecimal("base_price"),
                        rs.getString("pricing_type"), rs.getString("device_type"),
                        rs.getString("page_location"), rs.getString("category_name"),
                        rs.getString("inventory_mode"), rs.getInt("capacity"), true));
    }

    @GetMapping("/advertiser/profile")
    public Profile profile(Authentication auth) {
        return jdbc.query("SELECT a.* FROM advertisers a JOIN users u ON u.user_id = a.user_id " +
                        "WHERE u.email = ? AND u.role = 'ADVERTISER' AND u.status = 'ACTIVE'",
                this::mapProfile,
                auth.getName()).stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile not created"));
    }

    @GetMapping("/advertiser/profile/history")
    public List<ProfileChange> profileHistory(Authentication auth) {
        return jdbc.query("SELECT l.audit_id, l.action, l.old_value, l.new_value, l.created_at " +
                        "FROM audit_logs l JOIN advertisers a ON a.advertiser_id = l.target_id " +
                        "JOIN users u ON u.user_id = a.user_id " +
                        "WHERE u.email = ? AND u.role = 'ADVERTISER' AND u.status = 'ACTIVE' " +
                        "AND l.target_type = 'ADVERTISER_PROFILE' ORDER BY l.audit_id DESC LIMIT 20",
                (rs, row) -> new ProfileChange(String.valueOf(rs.getLong("audit_id")),
                        rs.getString("action"), readJson(rs.getString("old_value")),
                        readJson(rs.getString("new_value")), rs.getTimestamp("created_at").toLocalDateTime()),
                auth.getName());
    }

    @PutMapping("/advertiser/profile")
    @Transactional
    public Profile saveProfile(Authentication auth, @Valid @RequestBody ProfileInput input) {
        Long userId = jdbc.query("SELECT user_id FROM users WHERE email = ? AND role = 'ADVERTISER' " +
                        "AND status = 'ACTIVE'", (rs, row) -> rs.getLong(1), auth.getName())
                .stream().findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN));
        Profile before = jdbc.query("SELECT * FROM advertisers WHERE user_id = ? FOR UPDATE",
                this::mapProfile, userId).stream().findFirst().orElse(null);
        if (before != null) {
            boolean sameIdentity = Objects.equals(before.companyName(), input.companyName())
                    && Objects.equals(before.taxCode(), input.taxCode())
                    && Objects.equals(before.invoiceTaxCode(), input.invoiceTaxCode())
                    && Objects.equals(Objects.toString(before.businessLicenseUrl(), ""),
                            Objects.toString(input.businessLicenseUrl(), ""));
            jdbc.update("UPDATE advertisers SET company_name = ?, tax_code = ?, contact_person = ?, email = ?, " +
                            "phone = ?, address = ?, business_license_url = ?, business_sector = ?, " +
                            "invoice_name = ?, invoice_tax_code = ?, invoice_address = ?, invoice_email = ?, " +
                            "verification_status = ? WHERE user_id = ?",
                    input.companyName(), input.taxCode(), input.contactPerson(), input.email(), input.phone(),
                    input.address(), input.businessLicenseUrl(), input.businessSector(), input.invoiceName(),
                    input.invoiceTaxCode(), input.invoiceAddress(), input.invoiceEmail(),
                    sameIdentity ? before.verificationStatus() : "PENDING", userId);
        } else {
            jdbc.update("INSERT INTO advertisers (user_id, company_name, tax_code, contact_person, email, phone, " +
                            "address, business_license_url, business_sector, invoice_name, invoice_tax_code, " +
                            "invoice_address, invoice_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    userId, input.companyName(), input.taxCode(), input.contactPerson(), input.email(),
                    input.phone(), input.address(), input.businessLicenseUrl(), input.businessSector(),
                    input.invoiceName(), input.invoiceTaxCode(), input.invoiceAddress(), input.invoiceEmail());
        }
        Profile after = profile(auth);
        if (!after.equals(before)) {
            jdbc.update("INSERT INTO audit_logs (user_id, action, target_type, target_id, old_value, new_value) " +
                            "VALUES (?, ?, 'ADVERTISER_PROFILE', ?, ?, ?)",
                    userId, before == null ? "CREATE" : "UPDATE", Long.valueOf(after.id()),
                    before == null ? null : json.valueToTree(before).toString(),
                    json.valueToTree(after).toString());
        }
        return after;
    }

    private Profile mapProfile(ResultSet rs, int row) throws SQLException {
        return new Profile(String.valueOf(rs.getLong("advertiser_id")), rs.getString("company_name"),
                rs.getString("tax_code"), rs.getString("contact_person"), rs.getString("email"),
                rs.getString("phone"), rs.getString("address"), rs.getString("business_license_url"),
                rs.getString("business_sector"), rs.getString("invoice_name"),
                rs.getString("invoice_tax_code"), rs.getString("invoice_address"),
                rs.getString("invoice_email"), rs.getString("verification_status"));
    }

    private JsonNode readJson(String value) {
        if (value == null) return null;
        try {
            return json.readTree(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Invalid profile audit JSON", e);
        }
    }

    @ExceptionHandler(DuplicateKeyException.class)
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CONFLICT)
    public Map<String, String> duplicateTaxCode() {
        return Map.of("message", "Mã số thuế đã được sử dụng");
    }
}
