package com.devhire.auth.event;

import com.devhire.common.constants.KafkaTopics;
import com.devhire.common.event.AuditEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class AuditEventPublisher {
    private static final Logger log = LoggerFactory.getLogger(AuditEventPublisher.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public AuditEventPublisher(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publish(AuditEvent event) {
        try {
            kafkaTemplate.send(KafkaTopics.AUDIT_EVENTS, event.eventId().toString(), event);
        } catch (RuntimeException ex) {
            log.warn("audit_event_publish_failed action={} actorId={}", event.action(), event.actorId());
        }
    }
}

