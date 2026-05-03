package com.devhire.notification.event;

import com.devhire.common.constants.KafkaTopics;
import com.devhire.common.event.ApplicationStatusChangedEvent;
import com.devhire.common.event.ApplicationSubmittedEvent;
import com.devhire.common.outbox.ProcessedEventRepository;
import com.devhire.notification.service.NotificationService;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
public class ApplicationNotificationListener {
    private static final Logger log = LoggerFactory.getLogger(ApplicationNotificationListener.class);
    private static final String CONSUMER_NAME = "notification-service";

    private final NotificationService notificationService;
    private final ProcessedEventRepository processedEventRepository;

    public ApplicationNotificationListener(NotificationService notificationService,
                                           ProcessedEventRepository processedEventRepository) {
        this.notificationService = notificationService;
        this.processedEventRepository = processedEventRepository;
    }

    @KafkaListener(topics = KafkaTopics.APPLICATION_EVENTS, groupId = "${spring.kafka.consumer.group-id:notification-service}")
    public void onApplicationEvent(Object event) {
        if (event instanceof ConsumerRecord<?, ?> record) {
            onApplicationEvent(record.value());
            return;
        }
        if (event instanceof ApplicationSubmittedEvent submittedEvent) {
            handleSubmitted(submittedEvent);
            return;
        }
        if (event instanceof ApplicationStatusChangedEvent statusChangedEvent) {
            handleStatusChanged(statusChangedEvent);
            return;
        }
        if (event instanceof Map<?, ?> map) {
            handleMapPayload(map);
            return;
        }
        log.warn("unsupported_application_event_payload type={}", event == null ? "null" : event.getClass().getName());
    }

    private void handleMapPayload(Map<?, ?> payload) {
        if (payload.containsKey("newStatus")) {
            handleStatusChanged(new ApplicationStatusChangedEvent(
                    uuid(payload, "eventId"),
                    uuid(payload, "applicationId"),
                    uuid(payload, "jobId"),
                    uuid(payload, "candidateId"),
                    uuid(payload, "employerId"),
                    string(payload, "oldStatus"),
                    string(payload, "newStatus"),
                    instant(payload, "occurredAt")
            ));
            return;
        }
        if (payload.containsKey("jobTitle")) {
            handleSubmitted(new ApplicationSubmittedEvent(
                    uuid(payload, "eventId"),
                    uuid(payload, "applicationId"),
                    uuid(payload, "jobId"),
                    uuid(payload, "candidateId"),
                    uuid(payload, "employerId"),
                    string(payload, "jobTitle"),
                    instant(payload, "occurredAt")
            ));
            return;
        }
        log.warn("unsupported_application_event_map keys={}", payload.keySet());
    }

    private void handleSubmitted(ApplicationSubmittedEvent event) {
        if (!processedEventRepository.markProcessed(event.eventId(), CONSUMER_NAME)) {
            log.info("duplicate_application_event_skipped eventId={}", event.eventId());
            return;
        }
        try {
            notificationService.createForApplicationSubmitted(event);
        } catch (RuntimeException ex) {
            processedEventRepository.deleteProcessed(event.eventId(), CONSUMER_NAME);
            throw ex;
        }
    }

    private void handleStatusChanged(ApplicationStatusChangedEvent event) {
        if (!processedEventRepository.markProcessed(event.eventId(), CONSUMER_NAME)) {
            log.info("duplicate_application_event_skipped eventId={}", event.eventId());
            return;
        }
        try {
            notificationService.createForApplicationStatusChanged(event);
        } catch (RuntimeException ex) {
            processedEventRepository.deleteProcessed(event.eventId(), CONSUMER_NAME);
            throw ex;
        }
    }

    private static UUID uuid(Map<?, ?> payload, String key) {
        Object value = payload.get(key);
        return value instanceof UUID uuid ? uuid : UUID.fromString(String.valueOf(value));
    }

    private static String string(Map<?, ?> payload, String key) {
        return String.valueOf(payload.get(key));
    }

    private static Instant instant(Map<?, ?> payload, String key) {
        Object value = payload.get(key);
        return value instanceof Instant instant ? instant : Instant.parse(String.valueOf(value));
    }
}
