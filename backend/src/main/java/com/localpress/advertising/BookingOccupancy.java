package com.localpress.advertising;

/** Shared calendar occupancy for booking and slot configuration. */
public final class BookingOccupancy {
    private BookingOccupancy() {}
    public static final String SQL = "status IN ('PENDING', 'APPROVED', 'ACTIVE', 'SUSPENDED') AND payment_issue IS NULL "
            + "AND (payment_status = 'PAID' OR hold_expires_at IS NULL OR hold_expires_at > NOW())";
}
