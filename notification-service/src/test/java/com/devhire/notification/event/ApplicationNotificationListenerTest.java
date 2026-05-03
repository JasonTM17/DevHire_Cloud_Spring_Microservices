package com.devhire.notification.event;

import com.devhire.common.event.ApplicationSubmittedEvent;
import com.devhire.common.outbox.ProcessedEventRepository;
import com.devhire.notification.service.NotificationService;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ApplicationNotificationListenerTest {
    private final NotificationService notificationService = mock(NotificationService.class);
    private final ProcessedEventRepository processedEventRepository = mock(ProcessedEventRepository.class);
    private final ApplicationNotificationListener listener =
            new ApplicationNotificationListener(notificationService, processedEventRepository);

    @Test
    void skipsDuplicateApplicationEvent() {
        ApplicationSubmittedEvent event = new ApplicationSubmittedEvent(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                "Senior Java Engineer",
                Instant.now()
        );
        when(processedEventRepository.markProcessed(event.eventId(), "notification-service")).thenReturn(false);

        listener.onApplicationEvent(event);

        verify(notificationService, never()).createForApplicationSubmitted(event);
    }

    @Test
    void handlesFirstApplicationEvent() {
        ApplicationSubmittedEvent event = new ApplicationSubmittedEvent(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                "Senior Java Engineer",
                Instant.now()
        );
        when(processedEventRepository.markProcessed(event.eventId(), "notification-service")).thenReturn(true);

        listener.onApplicationEvent(event);

        verify(notificationService).createForApplicationSubmitted(event);
    }

    @Test
    void unwrapsConsumerRecordPayload() {
        ApplicationSubmittedEvent event = new ApplicationSubmittedEvent(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                "Senior Java Engineer",
                Instant.now()
        );
        when(processedEventRepository.markProcessed(event.eventId(), "notification-service")).thenReturn(true);

        listener.onApplicationEvent(new ConsumerRecord<>("application.events", 0, 1L, event.eventId().toString(), event));

        verify(notificationService).createForApplicationSubmitted(event);
    }

    @Test
    void deletesProcessedMarkerWhenHandlingFails() {
        ApplicationSubmittedEvent event = new ApplicationSubmittedEvent(
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                "Senior Java Engineer",
                Instant.now()
        );
        when(processedEventRepository.markProcessed(event.eventId(), "notification-service")).thenReturn(true);
        doThrow(new IllegalStateException("database unavailable"))
                .when(notificationService).createForApplicationSubmitted(event);

        assertThrows(IllegalStateException.class, () -> listener.onApplicationEvent(event));

        verify(processedEventRepository).deleteProcessed(event.eventId(), "notification-service");
    }
}
