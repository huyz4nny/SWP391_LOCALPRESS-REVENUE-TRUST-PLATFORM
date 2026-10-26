package com.localpress.identity.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "user_identities")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserIdentity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "identity_id")
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 30)
    private String provider;

    @Column(name = "provider_subject", nullable = false, length = 255)
    private String providerSubject;

    @Column(name = "email_at_link_time", length = 255)
    private String emailAtLinkTime;

    public static UserIdentity google(Long userId, String subject, String email) {
        UserIdentity identity = new UserIdentity();
        identity.userId = userId;
        identity.provider = "GOOGLE";
        identity.providerSubject = subject;
        identity.emailAtLinkTime = email;
        return identity;
    }
}
