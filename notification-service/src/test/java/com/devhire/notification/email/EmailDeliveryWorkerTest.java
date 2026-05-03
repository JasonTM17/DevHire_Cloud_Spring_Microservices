package com.devhire.notification.email;

import com.devhire.notification.config.EmailProperties;
import com.devhire.notification.entity.Notification;
import com.devhire.notification.repository.NotificationRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailDeliveryWorkerTest {
    private final NotificationRepository notificationRepository = mock(NotificationRepository.class);
    private final EmailNotificationDispatcher dispatcher = mock(EmailNotificationDispatcher.class);
    private final EmailRateLimiter rateLimiter = mock(EmailRateLimiter.class);
    private final EmailProperties properties = new EmailProperties(
            true, "no-reply@devhire.local", null, "http://localhost:8080", 25, 5, 30, 900, 1);
    private final EmailDeliveryWorker worker =
            new EmailDeliveryWorker(notificationRepository, dispatcher, rateLimiter, properties);

    @Test
    void dispatchesDueNotificationsUntilRateLimitIsReached() {
        Notification first = notification();
        Notification second = notification();
        when(notificationRepository.findDueEmailDeliveries(any(Instant.class), eq(25)))
                .thenReturn(List.of(first, second));
        when(rateLimiter.tryAcquire()).thenReturn(true, false);

        worker.dispatchDueEmails();

        verify(dispatcher).dispatch(first);
        verify(dispatcher, never()).dispatch(second);
    }

    private static Notification notification() {
        return new Notification(UUID.randomUUID(), "APPLICATION_STATUS_CHANGED", "Status", "Updated");
    }
}
