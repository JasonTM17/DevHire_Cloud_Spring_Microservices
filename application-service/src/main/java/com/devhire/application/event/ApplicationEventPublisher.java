package com.devhire.application.event;

import com.devhire.common.constants.KafkaTopics;
import com.devhire.common.event.ApplicationStatusChangedEvent;
import com.devhire.common.event.ApplicationSubmittedEvent;
import com.devhire.common.event.AuditEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class ApplicationEventPublisher {
    private static final Logger log = LoggerFactory.getLogger(ApplicationEventPublisher.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public ApplicationEventPublisher(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishSubmitted(ApplicationSubmittedEvent event) {
        try {
            kafkaTemplate.send(KafkaTopics.APPLICATION_EVENTS, event.eventId().toString(), event);
        } catch (RuntimeException ex) {
            log.warn("application_submitted_publish_failed applicationId={}", event.applicationId());
        }
    }

    public void publishStatusChanged(ApplicationStatusChangedEvent event) {
        try {
            kafkaTemplate.send(KafkaTopics.APPLICATION_EVENTS, event.eventId().toString(), event);
        } catch (RuntimeException ex) {
            log.warn("application_status_publish_failed applicationId={}", event.applicationId());
        }
    }

    public void publishAudit(AuditEvent event) {
        try {
            kafkaTemplate.send(KafkaTopics.AUDIT_EVENTS, event.eventId().toString(), event);
        } catch (RuntimeException ex) {
            log.warn("audit_event_publish_failed action={} actorId={}", event.action(), event.actorId());
        }
    }
}

