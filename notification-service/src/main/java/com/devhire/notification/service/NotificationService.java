package com.devhire.notification.service;

import com.devhire.common.error.ErrorCode;
import com.devhire.common.event.ApplicationStatusChangedEvent;
import com.devhire.common.event.ApplicationSubmittedEvent;
import com.devhire.common.event.NotificationCreatedEvent;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.notification.dto.NotificationWebSocketPayload;
import com.devhire.notification.dto.ReadReceiptPayload;
import com.devhire.notification.dto.WebSocketMessage;
import com.devhire.notification.dto.response.NotificationResponse;
import com.devhire.notification.entity.Notification;
import com.devhire.notification.event.NotificationEventPublisher;
import com.devhire.notification.mapper.NotificationMapper;
import com.devhire.notification.repository.NotificationRepository;
import com.devhire.notification.websocket.RedisPubSubBridge;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final String TYPE_APPLICATION_SUBMITTED = "APPLICATION_SUBMITTED";
    private static final String TYPE_APPLICATION_STATUS_CHANGED = "APPLICATION_STATUS_CHANGED";
    private static final String WS_MESSAGE_TYPE = "NOTIFICATION";
    private static final String WS_READ_RECEIPT_TYPE = "READ_RECEIPT";

    private final NotificationRepository notificationRepository;
    private final NotificationMapper mapper;
    private final NotificationEventPublisher eventPublisher;
    private final NotificationSequencer notificationSequencer;
    private final RedisPubSubBridge redisPubSubBridge;
    private final ObjectMapper objectMapper;

    public NotificationService(NotificationRepository notificationRepository,
                               NotificationMapper mapper,
                               NotificationEventPublisher eventPublisher,
                               NotificationSequencer notificationSequencer,
                               RedisPubSubBridge redisPubSubBridge,
                               ObjectMapper objectMapper) {
        this.notificationRepository = notificationRepository;
        this.mapper = mapper;
        this.eventPublisher = eventPublisher;
        this.notificationSequencer = notificationSequencer;
        this.redisPubSubBridge = redisPubSubBridge;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public NotificationResponse createForApplicationSubmitted(ApplicationSubmittedEvent event) {
        Notification notification = new Notification(
                event.employerId(),
                TYPE_APPLICATION_SUBMITTED,
                "New application received",
                "A candidate applied to " + event.jobTitle()
        );
        // Assign sequence number before persistence
        long sequenceNumber = notificationSequencer.nextSequence(event.employerId().toString());
        notification.setSequenceNumber(sequenceNumber);

        // Persist to DB first (requirement 13.3: persist before publishing to WebSocket)
        notification = notificationRepository.save(notification);

        // Publish Kafka event (existing behavior)
        publishCreated(notification);

        // Publish to WebSocket via Redis PubSub for real-time delivery (requirement 4.2)
        publishToWebSocket(notification);

        return mapper.toResponse(notification);
    }

    @Transactional
    public NotificationResponse createForApplicationStatusChanged(ApplicationStatusChangedEvent event) {
        Notification notification = new Notification(
                event.candidateId(),
                TYPE_APPLICATION_STATUS_CHANGED,
                "Application status updated",
                "Your application status changed from " + event.oldStatus() + " to " + event.newStatus()
        );
        // Assign sequence number before persistence
        long sequenceNumber = notificationSequencer.nextSequence(event.candidateId().toString());
        notification.setSequenceNumber(sequenceNumber);

        // Persist to DB first (requirement 13.3: persist before publishing to WebSocket)
        notification = notificationRepository.save(notification);

        // Publish Kafka event (existing behavior)
        publishCreated(notification);

        // Publish to WebSocket via Redis PubSub for real-time delivery (requirement 4.2)
        publishToWebSocket(notification);

        return mapper.toResponse(notification);
    }

    @Transactional(readOnly = true)
    public Page<NotificationResponse> findMine(AuthenticatedUser user, Pageable pageable) {
        return notificationRepository.findByRecipientId(user.id(), pageable).map(mapper::toResponse);
    }

    @Transactional
    public NotificationResponse markRead(AuthenticatedUser user, UUID notificationId) {
        Notification notification = notificationRepository.findByIdAndRecipientId(notificationId, user.id())
                .orElseThrow(() -> new DevHireException(ErrorCode.NOT_FOUND, "Notification not found"));
        notification.markRead();

        // Publish read-receipt event for cross-tab synchronization (requirement 5.4)
        publishReadReceipt(user.id().toString(), notification.getId(), true);

        return mapper.toResponse(notification);
    }

    @Transactional
    public List<NotificationResponse> markAllRead(AuthenticatedUser user) {
        List<Notification> unreadNotifications = notificationRepository.findByRecipientIdAndReadAtIsNull(user.id());
        List<NotificationResponse> responses = unreadNotifications
                .stream()
                .peek(Notification::markRead)
                .map(mapper::toResponse)
                .toList();

        // Publish read-receipt events for cross-tab synchronization (requirement 5.4)
        String userId = user.id().toString();
        for (Notification notification : unreadNotifications) {
            publishReadReceipt(userId, notification.getId(), true);
        }

        return responses;
    }

    private void publishCreated(Notification notification) {
        eventPublisher.publishCreated(new NotificationCreatedEvent(
                UUID.randomUUID(),
                notification.getId(),
                notification.getRecipientId(),
                notification.getType(),
                notification.getTitle(),
                Instant.now()
        ));
    }

    /**
     * Publishes the notification to the user's WebSocket STOMP destination via Redis PubSub.
     * This enables cross-instance delivery: the message is broadcast to all notification-service
     * instances, and the one holding the user's WebSocket session forwards it to the client.
     *
     * <p>The notification is already persisted to DB before this method is called, ensuring
     * at-least-once delivery semantics. If WebSocket delivery fails, the notification remains
     * in the database and can be retrieved via the REST fallback endpoint.</p>
     *
     * <p>Requirements: 4.2, 4.3, 13.3, 13.4</p>
     *
     * @param notification the persisted notification entity
     */
    private void publishToWebSocket(Notification notification) {
        try {
            String userId = notification.getRecipientId().toString();
            String destination = "/user/" + userId + "/notifications";

            NotificationWebSocketPayload payload = new NotificationWebSocketPayload(
                    notification.getId(),
                    notification.getType(),
                    notification.getTitle(),
                    notification.getMessage(),
                    notification.getCreatedAt(),
                    notification.isRead(),
                    notification.getSequenceNumber()
            );

            String serializedPayload = objectMapper.writeValueAsString(payload);

            WebSocketMessage wsMessage = new WebSocketMessage(
                    WS_MESSAGE_TYPE,
                    destination,
                    serializedPayload
            );

            redisPubSubBridge.publishToUser(userId, wsMessage);

            // Mark delivery timestamp
            notification.setDeliveredAt(Instant.now());

            log.debug("Published notification {} to WebSocket for user {} (seq={})",
                    notification.getId(), userId, notification.getSequenceNumber());
        } catch (JsonProcessingException ex) {
            // WebSocket delivery failed — notification is retained in DB for REST fallback (req 13.4)
            log.error("Failed to serialize notification {} for WebSocket delivery: {}",
                    notification.getId(), ex.getMessage(), ex);
        } catch (Exception ex) {
            // WebSocket delivery failed — notification is retained in DB for REST fallback (req 13.4)
            log.error("Failed to publish notification {} to WebSocket: {}",
                    notification.getId(), ex.getMessage(), ex);
        }
    }

    /**
     * Publishes a read-receipt event to the user's STOMP destination via Redis PubSub.
     * This enables cross-tab synchronization: when a notification is marked as read in one tab,
     * all other open tabs for the same user receive the read-receipt and update their UI.
     *
     * <p>Requirements: 5.4</p>
     *
     * @param userId         the user identifier
     * @param notificationId the notification that was marked as read
     * @param read           the new read state (true when marked as read)
     */
    private void publishReadReceipt(String userId, UUID notificationId, boolean read) {
        try {
            String destination = "/user/" + userId + "/notifications";

            ReadReceiptPayload payload = new ReadReceiptPayload(notificationId, read);
            String serializedPayload = objectMapper.writeValueAsString(payload);

            WebSocketMessage wsMessage = new WebSocketMessage(
                    WS_READ_RECEIPT_TYPE,
                    destination,
                    serializedPayload
            );

            redisPubSubBridge.publishToUser(userId, wsMessage);

            log.debug("Published read-receipt for notification {} to user {}", notificationId, userId);
        } catch (JsonProcessingException ex) {
            log.error("Failed to serialize read-receipt for notification {}: {}",
                    notificationId, ex.getMessage(), ex);
        } catch (Exception ex) {
            log.error("Failed to publish read-receipt for notification {}: {}",
                    notificationId, ex.getMessage(), ex);
        }
    }
}
