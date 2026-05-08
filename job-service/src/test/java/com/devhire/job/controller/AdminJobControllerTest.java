package com.devhire.job.controller;

import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.UserRole;
import com.devhire.common.web.GlobalExceptionHandler;
import com.devhire.job.dto.response.JobResponse;
import com.devhire.job.entity.JobStatus;
import com.devhire.job.service.JobService;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class AdminJobControllerTest {
    private final JobService jobService = mock(JobService.class);
    private final MockMvc mockMvc = standaloneSetup(new AdminJobController(jobService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
            .build();

    @Test
    void adminCanListPendingReviewJobs() throws Exception {
        UUID jobId = UUID.randomUUID();
        UUID companyId = UUID.randomUUID();
        UUID employerId = UUID.randomUUID();
        when(jobService.listForAdmin(any(), any(), any())).thenReturn(new PageImpl<>(List.of(new JobResponse(
                jobId, companyId, employerId, "Senior Java", "Build APIs", "Java", "Budget",
                BigDecimal.valueOf(3000), BigDecimal.valueOf(5000), "Remote", "Senior", "Full-time",
                List.of("Java"), JobStatus.PENDING_REVIEW, null, null,
                Instant.parse("2026-05-02T00:00:00Z"), Instant.parse("2026-05-02T00:00:00Z")
        )), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/admin/jobs?status=PENDING_REVIEW")
                        .header(AppHeaders.USER_ID, UUID.randomUUID())
                        .header(AppHeaders.USER_EMAIL, "admin@example.com")
                        .header(AppHeaders.USER_ROLE, UserRole.ADMIN.name()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].status", is("PENDING_REVIEW")));
    }
}
