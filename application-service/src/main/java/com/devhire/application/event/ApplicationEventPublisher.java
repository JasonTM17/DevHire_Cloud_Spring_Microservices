package com.devhire.application.event;

import com.devhire.common.constants.KafkaTopics;
import com.devhire.common.event.ApplicationStatusChangedEvent;
import com.devhire.common.event.ApplicationSubmittedEvent;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.outbox.OutboxEventWriter;
import org.springframework.stereotype.Component;

@Component
public class ApplicationEventPublisher {
    private static final String APPLICATION_AGGREGATE = "APPLICATION";

    private final OutboxEventWriter outboxEventWriter;

    public ApplicationEventPublisher(OutboxEventWriter outboxEventWriter) {
        this.outboxEventWriter = outboxEventWriter;
    }

    public void publishSubmitted(ApplicationSubmittedEvent event) {
        outboxEventWriter.enqueue(KafkaTopics.APPLICATION_EVENTS, event.eventId(), APPLICATION_AGGREGATE,
                event.applicationId(), "APPLICATION_SUBMITTED", event);
    }

    public void publishStatusChanged(ApplicationStatusChangedEvent event) {
        outboxEventWriter.enqueue(KafkaTopics.APPLICATION_EVENTS, event.eventId(), APPLICATION_AGGREGATE,
                event.applicationId(), "APPLICATION_STATUS_CHANGED", event);
    }

    public void publishAudit(AuditEvent event) {
        outboxEventWriter.enqueue(KafkaTopics.AUDIT_EVENTS, event.eventId(), APPLICATION_AGGREGATE,
                event.actorId(), event.action(), event);
    }
}
