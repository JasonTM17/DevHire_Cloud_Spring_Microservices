package com.devhire.user.repository;

import com.devhire.common.security.UserRole;
import com.devhire.user.entity.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserProfileRepository extends JpaRepository<UserProfile, UUID> {
    long countByRole(UserRole role);

    Optional<UserProfile> findByEmailIgnoreCase(String email);
}
