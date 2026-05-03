package com.devhire.ai.event;

import com.devhire.common.constants.KafkaTopics;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.outbox.OutboxEventWriter;
import org.springframework.stereotype.Component;

@Component
public class AiAuditEventPublisher {
    private static final String AGGREGATE_TYPE = "AI";

    private final OutboxEventWriter outboxEventWriter;

    public AiAuditEventPublisher(OutboxEventWriter outboxEventWriter) {
        this.outboxEventWriter = outboxEventWriter;
    }

    public void publish(AuditEvent event) {
        outboxEventWriter.enqueue(KafkaTopics.AUDIT_EVENTS, event.eventId(), AGGREGATE_TYPE,
                event.actorId(), event.action(), event);
    }
}
