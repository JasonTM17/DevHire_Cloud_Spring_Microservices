package com.devhire.notification.repository;

import com.devhire.notification.entity.Notification;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.jdbc.core.JdbcTemplate;
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
class NotificationRepositoryIT {
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
    private NotificationRepository notificationRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void flywaySeedCreatesUnreadAndEmailDeliveryBacklogEvidence() {
        UUID candidateId = UUID.fromString("10000000-0000-0000-0001-000000000001");

        assertThat(notificationRepository.count()).isGreaterThanOrEqualTo(223);
        assertThat(notificationRepository.findByRecipientIdAndReadAtIsNull(candidateId)).isNotEmpty();
        assertThat(countByEmailStatus("PENDING")).isGreaterThan(0);
        assertThat(countByEmailStatus("FAILED_RETRYABLE")).isGreaterThan(0);
        assertThat(countByEmailStatus("SENT")).isGreaterThan(0);
    }

    @Test
    void dueEmailDeliveryQuerySkipsLockedAndFutureOnlyRowsButIncludesExplicitDueRows() {
        UUID recipientId = UUID.fromString("10000000-0000-0000-0001-000000000060");
        Notification due = new Notification(recipientId, "APPLICATION_STATUS_CHANGED",
                "Due retry", "Retry queue evidence");
        due.markEmailRetryableFailure("candidate60@devhire.local", "Transient test failure",
                Instant.now().minusSeconds(60));
        notificationRepository.saveAndFlush(due);

        assertThat(notificationRepository.findDueEmailDeliveries(Instant.now(), 10))
                .extracting(Notification::getId)
                .contains(due.getId());
    }

    private long countByEmailStatus(String status) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM notifications WHERE email_status = ?",
                Long.class,
                status
        );
        return count == null ? 0 : count;
    }
}
