package com.devhire.common.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.kafka.core.KafkaTemplate;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OutboxEventPublisherTest {
    private final OutboxEventRepository repository = mock(OutboxEventRepository.class);
    private final KafkaTemplate<String, Object> kafkaTemplate = mock(KafkaTemplate.class);
    private final OutboxEventPublisher publisher = new OutboxEventPublisher(
            repository,
            kafkaTemplate,
            new ObjectMapper(),
            new OutboxProperties(true, 10, 3, 1000, 1000, 1, 60)
    );

    @Test
    void publishesPendingEventAndMarksPublished() {
        UUID eventId = UUID.randomUUID();
        OutboxEventRecord record = new OutboxEventRecord(
                11L,
                eventId,
                "audit.events",
                "AUTH",
                UUID.randomUUID(),
                "LOGIN",
                "{\"eventId\":\"" + eventId + "\",\"action\":\"LOGIN\"}",
                0
        );
        when(repository.findPublishable(10)).thenReturn(List.of(record));
        when(kafkaTemplate.send("audit.events", eventId.toString(), java.util.Map.of(
                "eventId", eventId.toString(),
                "action", "LOGIN"
        ))).thenReturn(CompletableFuture.completedFuture(null));

        publisher.publishPending();

        verify(repository).markPublished(11L);
        verify(repository, never()).markFailed(org.mockito.ArgumentMatchers.anyLong(),
                org.mockito.ArgumentMatchers.anyInt(),
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void marksFailedWhenKafkaSendFails() {
        UUID eventId = UUID.randomUUID();
        OutboxEventRecord record = new OutboxEventRecord(
                12L,
                eventId,
                "audit.events",
                "AUTH",
                UUID.randomUUID(),
                "LOGIN",
                "{\"eventId\":\"" + eventId + "\"}",
                0
        );
        when(repository.findPublishable(10)).thenReturn(List.of(record));
        when(kafkaTemplate.send(org.mockito.ArgumentMatchers.eq("audit.events"),
                org.mockito.ArgumentMatchers.eq(eventId.toString()),
                org.mockito.ArgumentMatchers.any()))
                .thenReturn(CompletableFuture.failedFuture(new IllegalStateException("broker unavailable")));

        publisher.publishPending();

        verify(repository).markFailed(org.mockito.ArgumentMatchers.eq(12L),
                org.mockito.ArgumentMatchers.eq(1),
                org.mockito.ArgumentMatchers.eq(OutboxStatus.FAILED.name()),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.contains("broker unavailable"));
    }
}
