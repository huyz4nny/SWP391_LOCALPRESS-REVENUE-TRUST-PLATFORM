package com.localpress.identity.repository;

import com.localpress.identity.entity.UserIdentity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserIdentityRepository extends JpaRepository<UserIdentity, Long> {
    Optional<UserIdentity> findByProviderAndProviderSubject(String provider, String providerSubject);
}
