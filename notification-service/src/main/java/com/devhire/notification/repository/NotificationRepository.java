package com.devhire.notification.repository;

import com.devhire.notification.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    Page<Notification> findByRecipientId(UUID recipientId, Pageable pageable);

    Optional<Notification> findByIdAndRecipientId(UUID id, UUID recipientId);

    List<Notification> findByRecipientIdAndReadAtIsNull(UUID recipientId);

    @Query(value = """
            SELECT *
            FROM notifications
            WHERE email_status IN ('PENDING', 'FAILED_RETRYABLE')
              AND (email_next_attempt_at IS NULL OR email_next_attempt_at <= :now)
            ORDER BY COALESCE(email_next_attempt_at, created_at), created_at
            LIMIT :limit
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<Notification> findDueEmailDeliveries(@Param("now") Instant now, @Param("limit") int limit);
}
