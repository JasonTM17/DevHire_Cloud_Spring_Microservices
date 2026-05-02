package com.devhire.job.controller;

import com.devhire.common.ApiResponse;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.devhire.job.dto.request.JobRejectRequest;
import com.devhire.job.dto.response.JobResponse;
import com.devhire.job.service.JobService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/admin/jobs")
public class AdminJobController {
    private final JobService jobService;

    public AdminJobController(JobService jobService) {
        this.jobService = jobService;
    }

    @PatchMapping("/{id}/approve")
    public ApiResponse<JobResponse> approve(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                            @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                            @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                            @PathVariable UUID id) {
        return ApiResponse.ok(jobService.approve(new AuthenticatedUser(userId, email, role), id));
    }

    @PatchMapping("/{id}/reject")
    public ApiResponse<JobResponse> reject(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                           @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                           @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                           @PathVariable UUID id,
                                           @Valid @RequestBody JobRejectRequest request) {
        return ApiResponse.ok(jobService.reject(new AuthenticatedUser(userId, email, role), id, request.reason()));
    }
}

