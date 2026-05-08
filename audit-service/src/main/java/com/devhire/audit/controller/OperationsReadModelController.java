package com.devhire.audit.controller;

import com.devhire.audit.dto.response.OperationsSummaryResponse;
import com.devhire.audit.service.OperationsReadModelService;
import com.devhire.common.ApiResponse;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class OperationsReadModelController {
    private final OperationsReadModelService readModelService;

    public OperationsReadModelController(OperationsReadModelService readModelService) {
        this.readModelService = readModelService;
    }

    @GetMapping("/admin/operations/summary")
    public ApiResponse<OperationsSummaryResponse> summary(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                          @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                          @RequestHeader(AppHeaders.USER_ROLE) UserRole role) {
        return ApiResponse.ok(readModelService.summary(new AuthenticatedUser(userId, email, role)));
    }
}
