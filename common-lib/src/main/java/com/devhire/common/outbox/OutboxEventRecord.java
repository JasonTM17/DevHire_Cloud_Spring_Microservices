package com.devhire.common.outbox;

import java.util.UUID;

public record OutboxEventRecord(
        long id,
        UUID eventId,
        String topic,
        String aggregateType,
        UUID aggregateId,
        String eventType,
        String payload,
        int attempts
) {
}
