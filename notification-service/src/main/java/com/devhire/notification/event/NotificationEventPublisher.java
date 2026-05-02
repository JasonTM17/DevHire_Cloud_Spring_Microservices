package com.devhire.notification.event;

import com.devhire.common.constants.KafkaTopics;
import com.devhire.common.event.NotificationCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class NotificationEventPublisher {
    private static final Logger log = LoggerFactory.getLogger(NotificationEventPublisher.class);

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public NotificationEventPublisher(KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishCreated(NotificationCreatedEvent event) {
        try {
            kafkaTemplate.send(KafkaTopics.NOTIFICATION_EVENTS, event.notificationId().toString(), event);
        } catch (RuntimeException ex) {
            log.warn("notification_created_publish_failed notificationId={} recipientId={}",
                    event.notificationId(), event.recipientId());
        }
    }
}
