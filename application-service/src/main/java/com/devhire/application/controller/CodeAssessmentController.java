package com.devhire.application.controller;

import com.devhire.application.dto.request.CodeReviewRequest;
import com.devhire.application.dto.request.CodeChallengeRequest;
import com.devhire.application.dto.request.CodeRunRequest;
import com.devhire.application.dto.request.CodeSubmissionRequest;
import com.devhire.application.dto.request.AssignCodeAssessmentRequest;
import com.devhire.application.dto.response.CodeAssessmentResponse;
import com.devhire.application.dto.response.CodeAssessmentSummaryResponse;
import com.devhire.application.dto.response.CodeChallengeResponse;
import com.devhire.application.dto.response.CodeRunResponse;
import com.devhire.application.dto.response.CodeSubmissionSummaryResponse;
import com.devhire.application.service.CodeAssessmentService;
import com.devhire.common.ApiResponse;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class CodeAssessmentController {
    private final CodeAssessmentService codeAssessmentService;

    public CodeAssessmentController(CodeAssessmentService codeAssessmentService) {
        this.codeAssessmentService = codeAssessmentService;
    }

    @GetMapping("/candidate/code-assessments")
    public ApiResponse<List<CodeAssessmentResponse>> candidateAssessments(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                          @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                          @RequestHeader(AppHeaders.USER_ROLE) UserRole role) {
        return ApiResponse.ok(codeAssessmentService.candidateAssessments(new AuthenticatedUser(userId, email, role)));
    }

    @GetMapping("/candidate/code-assessments/{id}")
    public ApiResponse<CodeAssessmentResponse> candidateAssessment(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                   @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                   @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                                   @PathVariable UUID id) {
        return ApiResponse.ok(codeAssessmentService.candidateAssessment(new AuthenticatedUser(userId, email, role), id));
    }

    @PostMapping({"/candidate/code-assessments/{id}/submissions", "/candidate/code-assessments/{id}/submit"})
    public ApiResponse<CodeAssessmentResponse> submit(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                      @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                      @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                      @PathVariable UUID id,
                                                      @Valid @RequestBody CodeSubmissionRequest request) {
        return ApiResponse.ok(codeAssessmentService.submit(new AuthenticatedUser(userId, email, role), id, request));
    }

    @PostMapping({"/candidate/code-assessments/{id}/runs", "/candidate/code-assessments/{id}/run"})
    public ApiResponse<CodeRunResponse> runVisibleCases(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                        @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                        @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                        @PathVariable UUID id,
                                                        @Valid @RequestBody CodeRunRequest request) {
        return ApiResponse.ok(codeAssessmentService.runVisibleCases(new AuthenticatedUser(userId, email, role), id, request));
    }

    @GetMapping("/candidate/code-assessments/{id}/runs/{runId}")
    public ApiResponse<CodeRunResponse> runStatus(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                  @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                  @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                  @PathVariable UUID id,
                                                  @PathVariable UUID runId) {
        return ApiResponse.ok(codeAssessmentService.runStatus(new AuthenticatedUser(userId, email, role), id, runId));
    }

    @GetMapping("/candidate/code-assessments/{id}/submissions")
    public ApiResponse<List<CodeSubmissionSummaryResponse>> candidateSubmissions(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                                 @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                                 @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                                                 @PathVariable UUID id) {
        return ApiResponse.ok(codeAssessmentService.candidateSubmissions(new AuthenticatedUser(userId, email, role), id));
    }

    @GetMapping("/employer/code-assessments")
    public ApiResponse<List<CodeAssessmentResponse>> employerAssessments(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                         @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                         @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                                         @RequestParam(required = false) String status,
                                                                         @RequestParam(required = false) UUID jobId) {
        return ApiResponse.ok(codeAssessmentService.employerAssessments(new AuthenticatedUser(userId, email, role), status, jobId));
    }

    @PostMapping("/employer/applications/{applicationId}/code-assessments")
    public ApiResponse<CodeAssessmentResponse> assign(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                      @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                      @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                      @PathVariable UUID applicationId,
                                                      @Valid @RequestBody(required = false) AssignCodeAssessmentRequest request) {
        return ApiResponse.ok(codeAssessmentService.assignToApplication(
                new AuthenticatedUser(userId, email, role), applicationId, request));
    }

    @GetMapping("/employer/code-assessments/{id}")
    public ApiResponse<CodeAssessmentResponse> employerAssessment(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                  @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                  @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                                  @PathVariable UUID id) {
        return ApiResponse.ok(codeAssessmentService.employerAssessment(new AuthenticatedUser(userId, email, role), id));
    }

    @GetMapping("/employer/code-assessments/{id}/submissions")
    public ApiResponse<List<CodeSubmissionSummaryResponse>> employerSubmissions(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                               @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                               @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                                               @PathVariable UUID id) {
        return ApiResponse.ok(codeAssessmentService.employerSubmissions(new AuthenticatedUser(userId, email, role), id));
    }

    @PatchMapping("/employer/code-assessments/{id}/review")
    public ApiResponse<CodeAssessmentResponse> review(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                      @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                      @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                      @PathVariable UUID id,
                                                      @Valid @RequestBody CodeReviewRequest request) {
        return ApiResponse.ok(codeAssessmentService.review(new AuthenticatedUser(userId, email, role), id, request));
    }

    @GetMapping("/admin/code-assessments/summary")
    public ApiResponse<CodeAssessmentSummaryResponse> adminSummary(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                   @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                   @RequestHeader(AppHeaders.USER_ROLE) UserRole role) {
        return ApiResponse.ok(codeAssessmentService.adminSummary(new AuthenticatedUser(userId, email, role)));
    }

    @GetMapping("/admin/code-challenges")
    public ApiResponse<List<CodeChallengeResponse>> adminCodeChallenges(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                        @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                        @RequestHeader(AppHeaders.USER_ROLE) UserRole role) {
        return ApiResponse.ok(codeAssessmentService.adminCodeChallenges(new AuthenticatedUser(userId, email, role)));
    }

    @PostMapping("/admin/code-challenges")
    public ApiResponse<CodeChallengeResponse> createCodeChallenge(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                  @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                  @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                                  @Valid @RequestBody CodeChallengeRequest request) {
        return ApiResponse.ok(codeAssessmentService.createCodeChallenge(new AuthenticatedUser(userId, email, role), request));
    }

    @PatchMapping("/admin/code-challenges/{id}")
    public ApiResponse<CodeChallengeResponse> updateCodeChallenge(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                  @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                  @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                                  @PathVariable UUID id,
                                                                  @Valid @RequestBody CodeChallengeRequest request) {
        return ApiResponse.ok(codeAssessmentService.updateCodeChallenge(new AuthenticatedUser(userId, email, role), id, request));
    }
}
