package com.devhire.company.event;

import com.devhire.common.constants.KafkaTopics;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.event.CompanyReviewedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class CompanyEventPublisher {
    private static final Logger log = LoggerFactory.getLogger(CompanyEventPublisher.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public CompanyEventPublisher(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishAudit(AuditEvent event) {
        try {
            kafkaTemplate.send(KafkaTopics.AUDIT_EVENTS, event.eventId().toString(), event);
        } catch (RuntimeException ex) {
            log.warn("audit_event_publish_failed action={} actorId={}", event.action(), event.actorId());
        }
    }

    public void publishCompanyReviewed(CompanyReviewedEvent event) {
        try {
            kafkaTemplate.send(KafkaTopics.COMPANY_EVENTS, event.eventId().toString(), event);
        } catch (RuntimeException ex) {
            log.warn("company_event_publish_failed companyId={} status={}", event.companyId(), event.status());
        }
    }
}

