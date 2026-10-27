package com.localpress.identity;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

class GoogleIdentityMigrationTest {
    @Test void migrationVersionsAreUniqueAndGoogleUsesV7() throws Exception {
        Path migrations = Path.of("src/main/resources/db/migration");
        var versionPattern = Pattern.compile("V(\\d+)__.*\\.sql");
        var versions = new HashSet<Integer>();

        try (var files = Files.list(migrations)) {
            for (Path file : files.toList()) {
                var match = versionPattern.matcher(file.getFileName().toString());
                if (match.matches()) {
                    int version = Integer.parseInt(match.group(1));
                    assertTrue(versions.add(version), "Duplicate Flyway version: V" + version);
                }
            }
        }

        assertTrue(Files.exists(migrations.resolve("V7__add_google_user_identities.sql")));
        assertFalse(Files.exists(migrations.resolve("V3__add_google_user_identities.sql")));
    }
}
