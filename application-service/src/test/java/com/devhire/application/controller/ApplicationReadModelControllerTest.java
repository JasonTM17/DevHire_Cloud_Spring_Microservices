package com.devhire.application.controller;

import com.devhire.application.dto.response.CandidateApplicationsSummaryResponse;
import com.devhire.application.dto.response.CandidateAssessmentResponse;
import com.devhire.application.dto.response.CandidateDashboardSummaryResponse;
import com.devhire.application.dto.response.CandidateOfferResponse;
import com.devhire.application.dto.response.CandidateTimelineItemResponse;
import com.devhire.application.dto.response.EmployerPipelineSummaryResponse;
import com.devhire.application.dto.response.StatusCountResponse;
import com.devhire.application.service.ApplicationReadModelService;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.UserRole;
import com.devhire.common.web.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class ApplicationReadModelControllerTest {
    private final ApplicationReadModelService readModelService = mock(ApplicationReadModelService.class);
    private final MockMvc mockMvc = standaloneSetup(new ApplicationReadModelController(readModelService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    void candidateDashboardSummaryReturnsTimelineAndStatusCounts() throws Exception {
        UUID applicationId = UUID.randomUUID();
        when(readModelService.candidateDashboard(any())).thenReturn(new CandidateDashboardSummaryResponse(
                8, 5, 2, 1,
                List.of(new StatusCountResponse("INTERVIEW", 2)),
                List.of(new CandidateTimelineItemResponse(applicationId, "Senior Platform Engineer",
                        "INTERVIEW", "Panel interview scheduled", Instant.parse("2026-05-05T10:00:00Z")))));

        mockMvc.perform(candidateGet("/candidate/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.applications", is(8)))
                .andExpect(jsonPath("$.data.statusDistribution[0].status", is("INTERVIEW")))
                .andExpect(jsonPath("$.data.timeline[0].title", is("Senior Platform Engineer")));
    }

    @Test
    void candidateApplicationsSummaryReturnsRecentActivity() throws Exception {
        UUID applicationId = UUID.randomUUID();
        when(readModelService.candidateApplications(any())).thenReturn(new CandidateApplicationsSummaryResponse(
                6, 1,
                List.of(new StatusCountResponse("SUBMITTED", 3)),
                List.of(new CandidateTimelineItemResponse(applicationId, "Cloud Backend Engineer",
                        "SUBMITTED", "Application received", Instant.parse("2026-05-04T09:00:00Z")))));

        mockMvc.perform(candidateGet("/candidate/applications/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalApplications", is(6)))
                .andExpect(jsonPath("$.data.duplicateProtectedJobs", is(1)))
                .andExpect(jsonPath("$.data.recentActivity[0].status", is("SUBMITTED")));
    }

    @Test
    void candidateOffersAndAssessmentsReturnCuratedExperienceData() throws Exception {
        UUID offerId = UUID.randomUUID();
        UUID assessmentId = UUID.randomUUID();
        when(readModelService.offers(any())).thenReturn(List.of(new CandidateOfferResponse(offerId, UUID.randomUUID(),
                "Senior Distributed Systems Engineer", "FinTech Corp", "$6,800/month", "PENDING",
                List.of("Hybrid", "Kafka platform ownership"), Instant.parse("2026-05-20T00:00:00Z"),
                Instant.parse("2026-05-01T00:00:00Z"))));
        when(readModelService.assessments(any())).thenReturn(List.of(new CandidateAssessmentResponse(assessmentId,
                "Distributed Systems Assessment", "DevHire Labs", 86, 100, "PASSED",
                List.of("Kafka", "PostgreSQL"), Instant.parse("2026-05-02T00:00:00Z"))));

        mockMvc.perform(candidateGet("/candidate/offers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].jobTitle", is("Senior Distributed Systems Engineer")))
                .andExpect(jsonPath("$.data[0].status", is("PENDING")));

        mockMvc.perform(candidateGet("/candidate/assessments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title", is("Distributed Systems Assessment")))
                .andExpect(jsonPath("$.data[0].score", is(86)));
    }

    @Test
    void employerPipelineSummaryReturnsOperationalQueue() throws Exception {
        when(readModelService.employerPipeline(any())).thenReturn(new EmployerPipelineSummaryResponse(
                24, 18, 7, 3,
                List.of(new StatusCountResponse("REVIEWING", 9)),
                List.of(new CandidateTimelineItemResponse(UUID.randomUUID(), "Principal Java Engineer",
                        "REVIEWING", "Hiring manager review", Instant.parse("2026-05-05T11:00:00Z")))));

        mockMvc.perform(get("/employer/pipeline/summary")
                        .header(AppHeaders.USER_ID, UUID.randomUUID())
                        .header(AppHeaders.USER_EMAIL, "employer@devhire.local")
                        .header(AppHeaders.USER_ROLE, UserRole.EMPLOYER.name()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalApplications", is(24)))
                .andExpect(jsonPath("$.data.statusDistribution[0].status", is("REVIEWING")));
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder candidateGet(String path) {
        return get(path)
                .header(AppHeaders.USER_ID, UUID.randomUUID())
                .header(AppHeaders.USER_EMAIL, "candidate@devhire.local")
                .header(AppHeaders.USER_ROLE, UserRole.CANDIDATE.name());
    }
}
