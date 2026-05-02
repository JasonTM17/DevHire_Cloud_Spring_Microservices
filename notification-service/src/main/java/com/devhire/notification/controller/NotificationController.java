package com.devhire.notification.controller;

import com.devhire.common.ApiResponse;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.devhire.notification.dto.response.NotificationResponse;
import com.devhire.notification.service.NotificationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class NotificationController {
    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping("/notifications")
    public ApiResponse<Page<NotificationResponse>> notifications(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                 @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                 @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                                 Pageable pageable) {
        return ApiResponse.ok(notificationService.findMine(new AuthenticatedUser(userId, email, role), pageable));
    }

    @PatchMapping("/notifications/{id}/read")
    public ApiResponse<NotificationResponse> markRead(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                      @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                      @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                      @PathVariable UUID id) {
        return ApiResponse.ok(notificationService.markRead(new AuthenticatedUser(userId, email, role), id));
    }

    @PatchMapping("/notifications/read-all")
    public ApiResponse<List<NotificationResponse>> markAllRead(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                               @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                               @RequestHeader(AppHeaders.USER_ROLE) UserRole role) {
        return ApiResponse.ok(notificationService.markAllRead(new AuthenticatedUser(userId, email, role)));
    }
}
