package com.localpress.administration.service;
import org.springframework.stereotype.Component;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import java.util.*;
import java.util.function.Supplier;
import java.nio.charset.StandardCharsets;
import java.sql.*;
@Component
@RequiredArgsConstructor
public class AdUrlScanLease {
    private final DataSource dataSource;
    // MySQL connection-scoped locks survive short result transactions, but not process death.
    // Both manual and automatic scans use the same creative lock. No DB row lock during HTTP.
    public <T> Optional<T> run(String key,Supplier<T> action) {
        try(Connection connection=dataSource.getConnection()) {
            String name="LP_URL_"+UUID.nameUUIDFromBytes((connection.getCatalog()+":"+key).getBytes(StandardCharsets.UTF_8));
            try(var lock=connection.prepareStatement("SELECT GET_LOCK(?,0)")) {
                lock.setString(1,name);
                try(var result=lock.executeQuery()) { if(!result.next()||result.getInt(1)!=1) return Optional.empty(); }
            }
            try { return Optional.ofNullable(action.get()); }
            finally {
                try(var release=connection.prepareStatement("SELECT RELEASE_LOCK(?)")) {
                    release.setString(1,name);release.execute();
                } catch(SQLException failure) { connection.abort(Runnable::run);throw failure; }
            }
        } catch(SQLException failure) { throw new org.springframework.dao.DataAccessResourceFailureException("URL scan lock unavailable",failure); }
    }
}
