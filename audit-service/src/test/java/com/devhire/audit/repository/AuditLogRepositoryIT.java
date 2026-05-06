package com.devhire.audit.repository;

import com.devhire.audit.entity.AuditLog;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers(disabledWithoutDocker = true)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AuditLogRepositoryIT {
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
    private AuditLogRepository auditLogRepository;

    @Test
    void flywaySeedCreatesFilterableAdministrativeAuditEvidence() {
        assertThat(auditLogRepository.count()).isGreaterThanOrEqualTo(284);
        assertThat(auditLogRepository.existsByEventId(UUID.fromString("61000000-0000-0000-0001-000000000001"))).isTrue();

        Specification<AuditLog> aiActions = (root, query, criteriaBuilder) ->
                criteriaBuilder.like(root.get("action"), "AI_%");
        Specification<AuditLog> recentPortfolioSeed = (root, query, criteriaBuilder) ->
                criteriaBuilder.greaterThan(root.get("occurredAt"), Instant.now().minusSeconds(90L * 24 * 60 * 60));

        assertThat(auditLogRepository.findAll(aiActions.and(recentPortfolioSeed))).isNotEmpty();
        assertThat(auditLogRepository.findAll((root, query, cb) ->
                cb.equal(root.get("actorRole"), "ADMIN"))).isNotEmpty();
    }
}
