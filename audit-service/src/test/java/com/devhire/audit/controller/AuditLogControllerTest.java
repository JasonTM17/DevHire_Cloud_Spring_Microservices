package com.devhire.audit.controller;

import com.devhire.audit.dto.response.AuditLogResponse;
import com.devhire.audit.service.AuditLogService;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.UserRole;
import com.devhire.common.web.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class AuditLogControllerTest {
    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final MockMvc mockMvc = standaloneSetup(new AuditLogController(auditLogService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
            .build();

    @Test
    void adminFiltersAuditLogs() throws Exception {
        UUID adminId = UUID.randomUUID();
        UUID actorId = UUID.randomUUID();
        UUID logId = UUID.randomUUID();
        when(auditLogService.findLogs(any(), eq(actorId), eq("approve job"), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(new AuditLogResponse(
                        logId,
                        UUID.randomUUID(),
                        actorId,
                        "admin@example.com",
                        "ADMIN",
                        "approve job",
                        "job",
                        "job-1",
                        Map.of("status", "PUBLISHED"),
                        Instant.parse("2026-05-02T00:00:00Z"),
                        Instant.parse("2026-05-02T00:00:00Z")
                )), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/admin/audit-logs")
                        .header(AppHeaders.USER_ID, adminId)
                        .header(AppHeaders.USER_EMAIL, "admin@example.com")
                        .header(AppHeaders.USER_ROLE, UserRole.ADMIN.name())
                        .queryParam("actorId", actorId.toString())
                        .queryParam("action", "approve job")
                        .queryParam("from", "2026-05-01T00:00:00Z")
                        .queryParam("to", "2026-05-03T00:00:00Z"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].id", is(logId.toString())))
                .andExpect(jsonPath("$.data.content[0].action", is("approve job")));
    }
}
