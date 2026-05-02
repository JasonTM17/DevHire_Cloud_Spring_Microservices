package com.devhire.notification.controller;

import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.UserRole;
import com.devhire.common.web.GlobalExceptionHandler;
import com.devhire.notification.dto.response.NotificationResponse;
import com.devhire.notification.entity.EmailStatus;
import com.devhire.notification.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class NotificationControllerTest {
    private final NotificationService notificationService = mock(NotificationService.class);
    private final MockMvc mockMvc = standaloneSetup(new NotificationController(notificationService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    void markNotificationAsReadUsesGatewayIdentityHeaders() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        when(notificationService.markRead(any(), any())).thenReturn(new NotificationResponse(
                notificationId,
                userId,
                "APPLICATION_STATUS_CHANGED",
                "Application status updated",
                "Your application status changed from SUBMITTED to INTERVIEW",
                true,
                Instant.parse("2026-05-02T00:00:00Z"),
                EmailStatus.SENT,
                "candidate@example.com",
                Instant.parse("2026-05-02T00:00:00Z"),
                Instant.parse("2026-05-02T00:00:00Z")
        ));

        mockMvc.perform(patch("/notifications/{id}/read", notificationId)
                        .header(AppHeaders.USER_ID, userId)
                        .header(AppHeaders.USER_EMAIL, "candidate@example.com")
                        .header(AppHeaders.USER_ROLE, UserRole.CANDIDATE.name()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id", is(notificationId.toString())))
                .andExpect(jsonPath("$.data.read", is(true)));
    }
}
