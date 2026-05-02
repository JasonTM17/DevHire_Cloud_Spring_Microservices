package com.devhire.notification.mapper;

import com.devhire.notification.dto.response.NotificationResponse;
import com.devhire.notification.entity.Notification;
import org.springframework.stereotype.Component;

@Component
public class NotificationMapper {
    public NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getRecipientId(),
                notification.getType(),
                notification.getTitle(),
                notification.getMessage(),
                notification.isRead(),
                notification.getReadAt(),
                notification.getEmailStatus(),
                notification.getEmailRecipient(),
                notification.getEmailSentAt(),
                notification.getCreatedAt()
        );
    }
}
