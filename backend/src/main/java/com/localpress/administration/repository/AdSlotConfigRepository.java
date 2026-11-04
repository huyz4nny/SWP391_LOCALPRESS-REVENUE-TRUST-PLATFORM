package com.localpress.administration.repository;

import com.localpress.advertising.BookingOccupancy;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class AdSlotConfigRepository {
    private final JdbcTemplate jdbc;
    public record Slot(long id, String code, String name, String pageLocation, String deviceType,
                       String dimensions, int capacity, String inventoryMode, BigDecimal basePrice,
                       String pricingType, String status, String categoryName) {}
    public record Reservation(LocalDate start, LocalDate end) {}
    private static final String SELECT = "SELECT s.*, c.name AS category_name FROM ad_slots s "
            + "LEFT JOIN categories c ON c.category_id=s.category_id ";
    private static final RowMapper<Slot> MAPPER = (rs, row) -> new Slot(rs.getLong("slot_id"),
            rs.getString("slot_code"), rs.getString("name"), rs.getString("page_location"),
            rs.getString("device_type"), rs.getString("dimensions"), rs.getInt("capacity"),
            rs.getString("inventory_mode"), rs.getBigDecimal("base_price"),
            rs.getString("pricing_type"), rs.getString("status"), rs.getString("category_name"));
    public List<Slot> list() { return jdbc.query(SELECT + "ORDER BY s.slot_id", MAPPER); }
    public Optional<Slot> lock(long id) {
        return jdbc.query(SELECT + "WHERE s.slot_id=? FOR UPDATE", MAPPER, id).stream().findFirst();
    }
    public List<Reservation> reservations(long id, LocalDate today) {
        // Current locking read, after locking the slot, same order as booking writes.
        return jdbc.query("SELECT start_date,end_date FROM ad_campaigns WHERE slot_id=? AND end_date>=? AND "
                + BookingOccupancy.SQL + " FOR SHARE", (rs, row) -> new Reservation(
                rs.getDate(1).toLocalDate(), rs.getDate(2).toLocalDate()), id, today);
    }
    public void update(long id, String name, BigDecimal price, int capacity, String status) {
        jdbc.update("UPDATE ad_slots SET name=?,base_price=?,capacity=?,status=? WHERE slot_id=?",
                name, price, capacity, status, id);
    }
    public void audit(long actor, long id, String before, String after, String ip) {
        jdbc.update("INSERT INTO audit_logs(user_id,action,target_type,target_id,old_value,new_value,ip_address,result) "
                + "VALUES (?,'UPDATE_AD_SLOT','AD_SLOT',?,?,?,?,'SUCCESS')", actor, id, before, after, ip);
    }
}
