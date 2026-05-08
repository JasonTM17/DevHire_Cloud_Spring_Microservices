package com.devhire.user.repository;

import com.devhire.common.security.UserRole;
import com.devhire.user.entity.UserProfile;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@Testcontainers(disabledWithoutDocker = true)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class UserProfileRepositoryIT {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired
    private UserProfileRepository userProfileRepository;

    @Test
    void flywaySeedCreatesCandidateAndEmployerProfileSegments() {
        assertThat(userProfileRepository.count()).isGreaterThanOrEqualTo(78);
        assertThat(userProfileRepository.countByRole(UserRole.CANDIDATE)).isGreaterThanOrEqualTo(65);
        assertThat(userProfileRepository.countByRole(UserRole.EMPLOYER)).isGreaterThanOrEqualTo(13);

        UserProfile candidate = userProfileRepository.findByEmailIgnoreCase("CANDIDATE@DEVHIRE.LOCAL").orElseThrow();
        assertThat(candidate.getRole()).isEqualTo(UserRole.CANDIDATE);
        assertThat(candidate.getSkillsCsv()).contains("Java", "Kafka");
        assertThat(candidate.getExpectedSalary()).isPositive();
    }

    @Test
    void emailUniquenessIsEnforcedCaseInsensitively() {
        UserProfile duplicate = new UserProfile(UUID.randomUUID(), "candidate@DEVHIRE.local", UserRole.CANDIDATE);

        assertThatThrownBy(() -> userProfileRepository.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
