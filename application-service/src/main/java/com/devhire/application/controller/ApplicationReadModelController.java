package com.devhire.application.controller;

import com.devhire.application.dto.response.CandidateApplicationsSummaryResponse;
import com.devhire.application.dto.response.CandidateAssessmentResponse;
import com.devhire.application.dto.response.CandidateDashboardSummaryResponse;
import com.devhire.application.dto.response.CandidateOfferResponse;
import com.devhire.application.dto.response.EmployerPipelineSummaryResponse;
import com.devhire.application.service.ApplicationReadModelService;
import com.devhire.common.ApiResponse;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class ApplicationReadModelController {
    private final ApplicationReadModelService readModelService;

    public ApplicationReadModelController(ApplicationReadModelService readModelService) {
        this.readModelService = readModelService;
    }

    @GetMapping("/candidate/dashboard/summary")
    public ApiResponse<CandidateDashboardSummaryResponse> candidateDashboard(
            @RequestHeader(AppHeaders.USER_ID) UUID userId,
            @RequestHeader(AppHeaders.USER_EMAIL) String email,
            @RequestHeader(AppHeaders.USER_ROLE) UserRole role) {
        return ApiResponse.ok(readModelService.candidateDashboard(new AuthenticatedUser(userId, email, role)));
    }

    @GetMapping("/candidate/applications/summary")
    public ApiResponse<CandidateApplicationsSummaryResponse> candidateApplications(
            @RequestHeader(AppHeaders.USER_ID) UUID userId,
            @RequestHeader(AppHeaders.USER_EMAIL) String email,
            @RequestHeader(AppHeaders.USER_ROLE) UserRole role) {
        return ApiResponse.ok(readModelService.candidateApplications(new AuthenticatedUser(userId, email, role)));
    }

    @GetMapping("/candidate/offers")
    public ApiResponse<List<CandidateOfferResponse>> offers(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                            @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                            @RequestHeader(AppHeaders.USER_ROLE) UserRole role) {
        return ApiResponse.ok(readModelService.offers(new AuthenticatedUser(userId, email, role)));
    }

    @GetMapping("/candidate/assessments")
    public ApiResponse<List<CandidateAssessmentResponse>> assessments(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                      @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                      @RequestHeader(AppHeaders.USER_ROLE) UserRole role) {
        return ApiResponse.ok(readModelService.assessments(new AuthenticatedUser(userId, email, role)));
    }

    @GetMapping("/employer/pipeline/summary")
    public ApiResponse<EmployerPipelineSummaryResponse> employerPipeline(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                        @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                        @RequestHeader(AppHeaders.USER_ROLE) UserRole role) {
        return ApiResponse.ok(readModelService.employerPipeline(new AuthenticatedUser(userId, email, role)));
    }
}
