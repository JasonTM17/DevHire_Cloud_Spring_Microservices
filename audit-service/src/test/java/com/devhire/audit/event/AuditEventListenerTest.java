package com.devhire.audit.event;

import com.devhire.audit.service.AuditLogService;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.outbox.ProcessedEventRepository;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuditEventListenerTest {
    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final ProcessedEventRepository processedEventRepository = mock(ProcessedEventRepository.class);
    private final AuditEventListener listener = new AuditEventListener(auditLogService, processedEventRepository);

    @Test
    void skipsDuplicateAuditEvent() {
        AuditEvent event = event();
        when(processedEventRepository.markProcessed(event.eventId(), "audit-service")).thenReturn(false);

        listener.onAuditEvent(event);

        verify(auditLogService, never()).record(event);
    }

    @Test
    void recordsFirstAuditEvent() {
        AuditEvent event = event();
        when(processedEventRepository.markProcessed(event.eventId(), "audit-service")).thenReturn(true);

        listener.onAuditEvent(event);

        verify(auditLogService).record(event);
    }

    @Test
    void unwrapsConsumerRecordPayload() {
        AuditEvent event = event();
        when(processedEventRepository.markProcessed(event.eventId(), "audit-service")).thenReturn(true);

        listener.onAuditEvent(new ConsumerRecord<>("audit.events", 0, 1L, event.eventId().toString(), event));

        verify(auditLogService).record(event);
    }

    @Test
    void deletesProcessedMarkerWhenRecordingFails() {
        AuditEvent event = event();
        when(processedEventRepository.markProcessed(event.eventId(), "audit-service")).thenReturn(true);
        doThrow(new IllegalStateException("database unavailable")).when(auditLogService).record(event);

        assertThrows(IllegalStateException.class, () -> listener.onAuditEvent(event));

        verify(processedEventRepository).deleteProcessed(event.eventId(), "audit-service");
    }

    private static AuditEvent event() {
        return new AuditEvent(
                UUID.randomUUID(),
                UUID.randomUUID(),
                "admin@devhire.local",
                "ADMIN",
                "APPROVE_JOB",
                "JOB",
                UUID.randomUUID().toString(),
                Map.of(),
                Instant.now()
        );
    }
}
