package com.devhire.common.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class OutboxEventWriterTest {
    @Test
    void serializesPayloadAndInsertsOutboxRow() {
        OutboxEventRepository repository = mock(OutboxEventRepository.class);
        OutboxEventWriter writer = new OutboxEventWriter(repository, new ObjectMapper());
        UUID eventId = UUID.randomUUID();
        UUID aggregateId = UUID.randomUUID();

        writer.enqueue("audit.events", eventId, "AUTH", aggregateId, "LOGIN", Map.of("action", "LOGIN"));

        verify(repository).insert(eventId, "audit.events", "AUTH", aggregateId, "LOGIN", "{\"action\":\"LOGIN\"}");
    }
}
