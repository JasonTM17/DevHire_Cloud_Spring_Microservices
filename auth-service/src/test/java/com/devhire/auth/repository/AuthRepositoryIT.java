package com.devhire.auth.repository;

import com.devhire.auth.entity.RefreshToken;
import com.devhire.auth.entity.UserAccount;
import com.devhire.common.security.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@Testcontainers(disabledWithoutDocker = true)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AuthRepositoryIT {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Test
    void flywaySeedCreatesPortfolioUsersAndEnforcesEmailUniqueness() {
        assertThat(userAccountRepository.count()).isGreaterThanOrEqualTo(75);

        UserAccount employer = userAccountRepository.findByEmail("employer@devhire.local").orElseThrow();
        assertThat(employer.getRole()).isEqualTo(UserRole.EMPLOYER);
        assertThat(employer.isEnabled()).isTrue();

        UserAccount duplicate = new UserAccount("EMPLOYER@DEVHIRE.LOCAL", "$2a$10$duplicate", UserRole.EMPLOYER);
        assertThatThrownBy(() -> userAccountRepository.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void refreshTokenRotationPersistsRevokeAndReplacementState() {
        UserAccount candidate = userAccountRepository.findByEmail("candidate@devhire.local").orElseThrow();
        String tokenHash = UUID.randomUUID().toString().replace("-", "");
        String replacementHash = UUID.randomUUID().toString().replace("-", "");

        RefreshToken token = refreshTokenRepository.saveAndFlush(
                new RefreshToken(candidate.getId(), tokenHash, Instant.now().plusSeconds(3600))
        );
        assertThat(token.isActive(Instant.now())).isTrue();

        token.revoke(Instant.now(), replacementHash);
        refreshTokenRepository.saveAndFlush(token);

        RefreshToken reloaded = refreshTokenRepository.findByTokenHash(tokenHash).orElseThrow();
        assertThat(reloaded.isActive(Instant.now())).isFalse();
        assertThat(reloaded.getReplacedByTokenHash()).isEqualTo(replacementHash);
    }
}
