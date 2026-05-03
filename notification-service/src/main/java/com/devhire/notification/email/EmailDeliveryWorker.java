package com.devhire.notification.email;

import com.devhire.notification.config.EmailProperties;
import com.devhire.notification.entity.Notification;
import com.devhire.notification.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
public class EmailDeliveryWorker {
    private static final Logger log = LoggerFactory.getLogger(EmailDeliveryWorker.class);

    private final NotificationRepository notificationRepository;
    private final EmailNotificationDispatcher dispatcher;
    private final EmailRateLimiter rateLimiter;
    private final EmailProperties properties;

    public EmailDeliveryWorker(NotificationRepository notificationRepository,
                               EmailNotificationDispatcher dispatcher,
                               EmailRateLimiter rateLimiter,
                               EmailProperties properties) {
        this.notificationRepository = notificationRepository;
        this.dispatcher = dispatcher;
        this.rateLimiter = rateLimiter;
        this.properties = properties;
    }

    @Scheduled(fixedDelayString = "${devhire.notification.email.dispatcher-fixed-delay-ms:5000}")
    @Transactional
    public void dispatchDueEmails() {
        List<Notification> dueNotifications =
                notificationRepository.findDueEmailDeliveries(Instant.now(), properties.batchSize());
        for (Notification notification : dueNotifications) {
            if (!rateLimiter.tryAcquire()) {
                log.info("email_rate_limit_reached batchRemaining=true");
                return;
            }
            dispatcher.dispatch(notification);
        }
    }
}
