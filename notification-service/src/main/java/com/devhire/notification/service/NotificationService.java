package com.devhire.notification.service;

import com.devhire.common.error.ErrorCode;
import com.devhire.common.event.ApplicationStatusChangedEvent;
import com.devhire.common.event.ApplicationSubmittedEvent;
import com.devhire.common.event.NotificationCreatedEvent;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.notification.dto.response.NotificationResponse;
import com.devhire.notification.entity.Notification;
import com.devhire.notification.email.EmailNotificationDispatcher;
import com.devhire.notification.event.NotificationEventPublisher;
import com.devhire.notification.mapper.NotificationMapper;
import com.devhire.notification.repository.NotificationRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {
    private static final String TYPE_APPLICATION_SUBMITTED = "APPLICATION_SUBMITTED";
    private static final String TYPE_APPLICATION_STATUS_CHANGED = "APPLICATION_STATUS_CHANGED";

    private final NotificationRepository notificationRepository;
    private final NotificationMapper mapper;
    private final NotificationEventPublisher eventPublisher;
    private final EmailNotificationDispatcher emailDispatcher;

    public NotificationService(NotificationRepository notificationRepository,
                               NotificationMapper mapper,
                               NotificationEventPublisher eventPublisher,
                               EmailNotificationDispatcher emailDispatcher) {
        this.notificationRepository = notificationRepository;
        this.mapper = mapper;
        this.eventPublisher = eventPublisher;
        this.emailDispatcher = emailDispatcher;
    }

    @Transactional
    public NotificationResponse createForApplicationSubmitted(ApplicationSubmittedEvent event) {
        Notification notification = notificationRepository.save(new Notification(
                event.employerId(),
                TYPE_APPLICATION_SUBMITTED,
                "New application received",
                "A candidate applied to " + event.jobTitle()
        ));
        emailDispatcher.dispatch(notification);
        publishCreated(notification);
        return mapper.toResponse(notification);
    }

    @Transactional
    public NotificationResponse createForApplicationStatusChanged(ApplicationStatusChangedEvent event) {
        Notification notification = notificationRepository.save(new Notification(
                event.candidateId(),
                TYPE_APPLICATION_STATUS_CHANGED,
                "Application status updated",
                "Your application status changed from " + event.oldStatus() + " to " + event.newStatus()
        ));
        emailDispatcher.dispatch(notification);
        publishCreated(notification);
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
        return mapper.toResponse(notification);
    }

    @Transactional
    public List<NotificationResponse> markAllRead(AuthenticatedUser user) {
        return notificationRepository.findByRecipientIdAndReadAtIsNull(user.id())
                .stream()
                .peek(Notification::markRead)
                .map(mapper::toResponse)
                .toList();
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
}
