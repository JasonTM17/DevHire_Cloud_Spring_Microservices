package com.devhire.job.controller;

import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.UserRole;
import com.devhire.common.web.GlobalExceptionHandler;
import com.devhire.job.dto.request.JobCreateRequest;
import com.devhire.job.dto.response.JobResponse;
import com.devhire.job.entity.JobStatus;
import com.devhire.job.service.JobService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class JobControllerTest {
    private final JobService jobService = mock(JobService.class);
    private final MockMvc mockMvc = standaloneSetup(new JobController(jobService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    void createJobReturnsDraft() throws Exception {
        UUID jobId = UUID.randomUUID();
        UUID employerId = UUID.randomUUID();
        UUID companyId = UUID.randomUUID();
        when(jobService.create(any(), any())).thenReturn(new JobResponse(jobId, companyId, employerId,
                "Senior Java", "Build APIs", "Java", "Budget", BigDecimal.valueOf(3000), BigDecimal.valueOf(5000),
                "Remote", "Senior", "Full-time", List.of("Java"), JobStatus.DRAFT, null, null,
                Instant.parse("2026-05-02T00:00:00Z"), Instant.parse("2026-05-02T00:00:00Z")));

        mockMvc.perform(post("/jobs")
                        .header(AppHeaders.USER_ID, employerId)
                        .header(AppHeaders.USER_EMAIL, "employer@example.com")
                        .header(AppHeaders.USER_ROLE, UserRole.EMPLOYER.name())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new JobCreateRequest(companyId, "Senior Java",
                                "Build APIs", "Java", "Budget", BigDecimal.valueOf(3000), BigDecimal.valueOf(5000),
                                "Remote", "Senior", "Full-time", List.of("Java")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id", is(jobId.toString())))
                .andExpect(jsonPath("$.data.status", is("DRAFT")));
    }

    @Test
    void createJobRejectsBlankTitle() throws Exception {
        UUID employerId = UUID.randomUUID();
        mockMvc.perform(post("/jobs")
                        .header(AppHeaders.USER_ID, employerId)
                        .header(AppHeaders.USER_EMAIL, "employer@example.com")
                        .header(AppHeaders.USER_ROLE, UserRole.EMPLOYER.name())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "companyId": "20000000-0000-0000-0000-000000000001",
                                  "title": "",
                                  "description": "Build APIs"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("VALIDATION_ERROR")));
    }

    @Test
    void publicGetReturnsPublishedJobDetail() throws Exception {
        UUID jobId = UUID.randomUUID();
        UUID employerId = UUID.randomUUID();
        UUID companyId = UUID.randomUUID();
        when(jobService.get(jobId)).thenReturn(new JobResponse(jobId, companyId, employerId,
                "Senior Java", "Build APIs", "Java", "Budget", BigDecimal.valueOf(3000), BigDecimal.valueOf(5000),
                "Remote", "Senior", "Full-time", List.of("Java"), JobStatus.PUBLISHED, null,
                Instant.parse("2026-05-02T01:00:00Z"), Instant.parse("2026-05-02T00:00:00Z"),
                Instant.parse("2026-05-02T00:00:00Z")));

        mockMvc.perform(get("/jobs/{id}", jobId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("PUBLISHED")));
    }
}
