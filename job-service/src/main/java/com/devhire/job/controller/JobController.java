package com.devhire.job.controller;

import com.devhire.common.ApiResponse;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.devhire.job.dto.request.JobCreateRequest;
import com.devhire.job.dto.request.JobRejectRequest;
import com.devhire.job.dto.request.JobSearchCriteria;
import com.devhire.job.dto.response.JobResponse;
import com.devhire.job.service.JobService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/jobs")
public class JobController {
    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @PostMapping
    public ApiResponse<JobResponse> create(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                           @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                           @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                           @Valid @RequestBody JobCreateRequest request) {
        return ApiResponse.ok(jobService.create(new AuthenticatedUser(userId, email, role), request));
    }

    @GetMapping
    public ApiResponse<Page<JobResponse>> search(JobSearchCriteria criteria, Pageable pageable) {
        return ApiResponse.ok(jobService.search(criteria, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<JobResponse> get(@PathVariable UUID id) {
        return ApiResponse.ok(jobService.get(id));
    }

    @PutMapping("/{id}")
    public ApiResponse<JobResponse> update(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                           @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                           @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                           @PathVariable UUID id,
                                           @Valid @RequestBody JobCreateRequest request) {
        return ApiResponse.ok(jobService.update(new AuthenticatedUser(userId, email, role), id, request));
    }

    @PatchMapping("/{id}/submit-review")
    public ApiResponse<JobResponse> submitReview(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                 @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                 @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                 @PathVariable UUID id) {
        return ApiResponse.ok(jobService.submitReview(new AuthenticatedUser(userId, email, role), id));
    }

    @PatchMapping("/{id}/close")
    public ApiResponse<JobResponse> close(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                          @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                          @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                          @PathVariable UUID id) {
        return ApiResponse.ok(jobService.close(new AuthenticatedUser(userId, email, role), id));
    }
}

