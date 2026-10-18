package com.localpress.identity.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    @Column(name = "email", nullable = false, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "avatar_url", length = 1000)
    private String avatarUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private Status status;

    @Column(name = "failed_attempts", nullable = false)
    private Integer failedAttempts;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    public static User createReader(
            String fullName,
            String email,
            String passwordHash,
            String phone
    ) {
        User user = new User();

        user.fullName = fullName;
        user.email = email;
        user.passwordHash = passwordHash;
        user.phone = phone;

        user.role = Role.READER;
        user.status = Status.ACTIVE;
        user.failedAttempts = 0;

        return user;
    }

    public static User createGoogleReader(String name, String email, String passwordHash, String avatarUrl) {
        User user = createReader(name, email, passwordHash, null);
        user.avatarUrl = avatarUrl;
        return user;
    }

    public enum Role {
        READER,
        AUTHOR,
        EDITOR,
        STAFF,
        ACCOUNTANT,
        ADVERTISER,
        SYSTEM_ADMIN
    }

    public enum Status {
        ACTIVE,
        LOCKED
    }
}
