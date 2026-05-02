package com.devhire.audit.controller;

import com.devhire.audit.dto.response.AuditLogResponse;
import com.devhire.audit.service.AuditLogService;
import com.devhire.common.ApiResponse;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.UUID;

@RestController
public class AuditLogController {
    private final AuditLogService auditLogService;

    public AuditLogController(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @GetMapping("/admin/audit-logs")
    public ApiResponse<Page<AuditLogResponse>> auditLogs(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                         @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                         @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                         @RequestParam(required = false) UUID actorId,
                                                         @RequestParam(required = false) String action,
                                                         @RequestParam(required = false)
                                                         @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                                                         Instant from,
                                                         @RequestParam(required = false)
                                                         @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                                                         Instant to,
                                                         Pageable pageable) {
        return ApiResponse.ok(auditLogService.findLogs(
                new AuthenticatedUser(userId, email, role), actorId, action, from, to, pageable));
    }
}
