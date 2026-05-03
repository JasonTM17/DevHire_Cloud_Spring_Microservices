package com.devhire.audit.event;

import com.devhire.audit.service.AuditLogService;
import com.devhire.common.constants.KafkaTopics;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.outbox.ProcessedEventRepository;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
public class AuditEventListener {
    private static final Logger log = LoggerFactory.getLogger(AuditEventListener.class);
    private static final String CONSUMER_NAME = "audit-service";

    private final AuditLogService auditLogService;
    private final ProcessedEventRepository processedEventRepository;

    public AuditEventListener(AuditLogService auditLogService,
                              ProcessedEventRepository processedEventRepository) {
        this.auditLogService = auditLogService;
        this.processedEventRepository = processedEventRepository;
    }

    @KafkaListener(topics = KafkaTopics.AUDIT_EVENTS, groupId = "${spring.kafka.consumer.group-id:audit-service}")
    public void onAuditEvent(Object event) {
        if (event instanceof ConsumerRecord<?, ?> record) {
            onAuditEvent(record.value());
            return;
        }
        if (event instanceof AuditEvent auditEvent) {
            recordOnce(auditEvent);
            return;
        }
        if (event instanceof Map<?, ?> payload) {
            recordOnce(fromMap(payload));
            return;
        }
        log.warn("unsupported_audit_event_payload type={}", event == null ? "null" : event.getClass().getName());
    }

    private void recordOnce(AuditEvent auditEvent) {
        if (!processedEventRepository.markProcessed(auditEvent.eventId(), CONSUMER_NAME)) {
            log.info("duplicate_audit_event_skipped eventId={}", auditEvent.eventId());
            return;
        }
        try {
            auditLogService.record(auditEvent);
        } catch (RuntimeException ex) {
            processedEventRepository.deleteProcessed(auditEvent.eventId(), CONSUMER_NAME);
            throw ex;
        }
    }

    private static AuditEvent fromMap(Map<?, ?> payload) {
        return new AuditEvent(
                uuid(payload, "eventId"),
                uuid(payload, "actorId"),
                nullableString(payload, "actorEmail"),
                nullableString(payload, "actorRole"),
                string(payload, "action"),
                nullableString(payload, "resourceType"),
                nullableString(payload, "resourceId"),
                metadata(payload),
                instant(payload, "occurredAt")
        );
    }

    private static Map<String, Object> metadata(Map<?, ?> payload) {
        Object value = payload.get("metadata");
        if (value instanceof Map<?, ?> map) {
            return map.entrySet().stream()
                    .collect(java.util.stream.Collectors.toMap(entry -> String.valueOf(entry.getKey()), Map.Entry::getValue));
        }
        return Map.of();
    }

    private static UUID uuid(Map<?, ?> payload, String key) {
        Object value = payload.get(key);
        if (value == null) {
            return null;
        }
        return value instanceof UUID uuid ? uuid : UUID.fromString(String.valueOf(value));
    }

    private static String string(Map<?, ?> payload, String key) {
        return String.valueOf(payload.get(key));
    }

    private static String nullableString(Map<?, ?> payload, String key) {
        Object value = payload.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private static Instant instant(Map<?, ?> payload, String key) {
        Object value = payload.get(key);
        return value instanceof Instant instant ? instant : Instant.parse(String.valueOf(value));
    }
}
