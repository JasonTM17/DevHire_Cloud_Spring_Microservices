package com.devhire.application.controller;

import com.devhire.application.dto.request.ApplicationStatusUpdateRequest;
import com.devhire.application.dto.request.SubmitApplicationRequest;
import com.devhire.application.dto.response.ApplicationResponse;
import com.devhire.application.service.ApplicationWorkflowService;
import com.devhire.common.ApiResponse;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class ApplicationController {
    private final ApplicationWorkflowService workflowService;

    public ApplicationController(ApplicationWorkflowService workflowService) {
        this.workflowService = workflowService;
    }

    @PostMapping("/jobs/{jobId}/applications")
    public ApiResponse<ApplicationResponse> submit(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                   @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                   @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                   @PathVariable UUID jobId,
                                                   @Valid @RequestBody SubmitApplicationRequest request) {
        return ApiResponse.ok(workflowService.submit(new AuthenticatedUser(userId, email, role), jobId, request));
    }

    @GetMapping("/applications/me")
    public ApiResponse<Page<ApplicationResponse>> myApplications(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                 @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                 @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                                 Pageable pageable) {
        return ApiResponse.ok(workflowService.findMine(new AuthenticatedUser(userId, email, role), pageable));
    }

    @GetMapping("/employer/jobs/{jobId}/applications")
    public ApiResponse<Page<ApplicationResponse>> jobApplications(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                  @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                  @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                                  @PathVariable UUID jobId,
                                                                  Pageable pageable) {
        return ApiResponse.ok(workflowService.findForEmployerJob(new AuthenticatedUser(userId, email, role), jobId, pageable));
    }

    @PatchMapping("/applications/{id}/status")
    public ApiResponse<ApplicationResponse> updateStatus(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                         @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                         @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                         @PathVariable UUID id,
                                                         @Valid @RequestBody ApplicationStatusUpdateRequest request) {
        return ApiResponse.ok(workflowService.updateStatus(new AuthenticatedUser(userId, email, role), id, request));
    }

    @PatchMapping("/applications/{id}/withdraw")
    public ApiResponse<ApplicationResponse> withdraw(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                     @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                     @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                     @PathVariable UUID id) {
        return ApiResponse.ok(workflowService.withdraw(new AuthenticatedUser(userId, email, role), id));
    }
}

