package com.devhire.application.controller;

import com.devhire.application.dto.request.CodeReviewRequest;
import com.devhire.application.dto.request.CodeSubmissionRequest;
import com.devhire.application.dto.response.CodeAssessmentResponse;
import com.devhire.application.dto.response.CodeAssessmentSummaryResponse;
import com.devhire.application.dto.response.RubricScoreResponse;
import com.devhire.application.dto.response.StatusCountResponse;
import com.devhire.application.service.CodeAssessmentService;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.UserRole;
import com.devhire.common.web.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class CodeAssessmentControllerTest {
    private final CodeAssessmentService service = mock(CodeAssessmentService.class);
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final MockMvc mockMvc = standaloneSetup(new CodeAssessmentController(service))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    void candidateCanListAndSubmitCodeAssessment() throws Exception {
        UUID assignmentId = UUID.randomUUID();
        when(service.candidateAssessments(any())).thenReturn(List.of(response(assignmentId, "AUTO_REVIEWED")));
        when(service.submit(any(), eq(assignmentId), any())).thenReturn(response(assignmentId, "AUTO_REVIEWED"));

        mockMvc.perform(candidateGet("/candidate/code-assessments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].challengeTitle", is("Java outbox retry reviewer")))
                .andExpect(jsonPath("$.data[0].rubric[0].category", is("Correctness and completeness")));

        mockMvc.perform(post("/candidate/code-assessments/{id}/submissions", assignmentId)
                        .headers(candidateHeaders())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CodeSubmissionRequest(
                                "Java",
                                "class Solution { @Test void givenPending_whenReviewed_thenPublishesBatch(){ assert true; } }",
                                "I focused on idempotent outbox handling."))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.latestScore", is(88)));
    }

    @Test
    void employerCanReviewSubmissionAndAdminCanReadSummary() throws Exception {
        UUID assignmentId = UUID.randomUUID();
        when(service.review(any(), eq(assignmentId), any())).thenReturn(response(assignmentId, "PASSED"));
        when(service.adminSummary(any())).thenReturn(new CodeAssessmentSummaryResponse(
                18, 14, 6, 4, 3, 1, 84.5, 2,
                List.of(new StatusCountResponse("AUTO_REVIEWED", 6))));

        mockMvc.perform(patch("/employer/code-assessments/{id}/review", assignmentId)
                        .headers(employerHeaders())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CodeReviewRequest("ADVANCE", "Strong rubric evidence", 91))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("PASSED")));

        mockMvc.perform(get("/admin/code-assessments/summary")
                        .header(AppHeaders.USER_ID, UUID.randomUUID())
                        .header(AppHeaders.USER_EMAIL, "admin@devhire.local")
                        .header(AppHeaders.USER_ROLE, UserRole.ADMIN.name()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalAssignments", is(18)))
                .andExpect(jsonPath("$.data.averageScore", is(84.5)));
    }

    private static CodeAssessmentResponse response(UUID id, String status) {
        return new CodeAssessmentResponse(
                id,
                UUID.randomUUID(),
                "Linh Nguyen",
                "Senior Java Platform Engineer",
                "Java outbox retry reviewer",
                "Senior",
                "Java",
                "Implement retry-safe outbox review.",
                "No code execution; explain transaction boundaries.",
                "class OutboxRetryReviewer {}",
                status,
                100,
                88,
                "ADVANCE",
                List.of("Java", "Kafka", "Outbox"),
                List.of(new RubricScoreResponse("Correctness and completeness", 34, 40, "Signals found")),
                List.of("missing-test-evidence"),
                "Strong submission with employer review ready evidence.",
                true,
                "class CandidateSolution { assert true; }",
                Instant.parse("2026-05-20T00:00:00Z"),
                Instant.parse("2026-05-01T00:00:00Z"),
                Instant.parse("2026-05-06T00:00:00Z"));
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder candidateGet(String path) {
        return get(path).headers(candidateHeaders());
    }

    private static org.springframework.http.HttpHeaders candidateHeaders() {
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.set(AppHeaders.USER_ID, UUID.randomUUID().toString());
        headers.set(AppHeaders.USER_EMAIL, "candidate@devhire.local");
        headers.set(AppHeaders.USER_ROLE, UserRole.CANDIDATE.name());
        return headers;
    }

    private static org.springframework.http.HttpHeaders employerHeaders() {
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.set(AppHeaders.USER_ID, UUID.randomUUID().toString());
        headers.set(AppHeaders.USER_EMAIL, "employer@devhire.local");
        headers.set(AppHeaders.USER_ROLE, UserRole.EMPLOYER.name());
        return headers;
    }
}
