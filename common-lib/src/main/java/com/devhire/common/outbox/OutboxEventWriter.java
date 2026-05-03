package com.devhire.common.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.UUID;

public class OutboxEventWriter {
    private final OutboxEventRepository repository;
    private final ObjectMapper objectMapper;

    public OutboxEventWriter(OutboxEventRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public void enqueue(String topic,
                        UUID eventId,
                        String aggregateType,
                        UUID aggregateId,
                        String eventType,
                        Object payload) {
        try {
            repository.insert(eventId, topic, aggregateType, aggregateId, eventType, objectMapper.writeValueAsString(payload));
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Outbox payload cannot be serialized", ex);
        }
    }
}
