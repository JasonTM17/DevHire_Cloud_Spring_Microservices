package com.devhire.job.event;

import com.devhire.common.constants.KafkaTopics;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.event.JobApprovedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class JobEventPublisher {
    private static final Logger log = LoggerFactory.getLogger(JobEventPublisher.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public JobEventPublisher(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishAudit(AuditEvent event) {
        try {
            kafkaTemplate.send(KafkaTopics.AUDIT_EVENTS, event.eventId().toString(), event);
        } catch (RuntimeException ex) {
            log.warn("audit_event_publish_failed action={} actorId={}", event.action(), event.actorId());
        }
    }

    public void publishJobApproved(JobApprovedEvent event) {
        try {
            kafkaTemplate.send(KafkaTopics.JOB_EVENTS, event.eventId().toString(), event);
        } catch (RuntimeException ex) {
            log.warn("job_event_publish_failed jobId={}", event.jobId());
        }
    }
}

