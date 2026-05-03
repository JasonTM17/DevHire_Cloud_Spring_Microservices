package com.devhire.notification.event;

import com.devhire.common.constants.KafkaTopics;
import com.devhire.common.event.NotificationCreatedEvent;
import com.devhire.common.outbox.OutboxEventWriter;
import org.springframework.stereotype.Component;

@Component
public class NotificationEventPublisher {
    private static final String NOTIFICATION_AGGREGATE = "NOTIFICATION";

    private final OutboxEventWriter outboxEventWriter;

    public NotificationEventPublisher(OutboxEventWriter outboxEventWriter) {
        this.outboxEventWriter = outboxEventWriter;
    }

    public void publishCreated(NotificationCreatedEvent event) {
        outboxEventWriter.enqueue(KafkaTopics.NOTIFICATION_EVENTS, event.eventId(), NOTIFICATION_AGGREGATE,
                event.notificationId(), "NOTIFICATION_CREATED", event);
    }
}
