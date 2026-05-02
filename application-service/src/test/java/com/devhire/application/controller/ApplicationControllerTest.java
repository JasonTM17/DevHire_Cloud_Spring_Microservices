package com.devhire.application.controller;

import com.devhire.application.dto.request.SubmitApplicationRequest;
import com.devhire.application.dto.response.ApplicationResponse;
import com.devhire.application.entity.ApplicationStatus;
import com.devhire.application.service.ApplicationWorkflowService;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.UserRole;
import com.devhire.common.web.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class ApplicationControllerTest {
    private final ApplicationWorkflowService workflowService = mock(ApplicationWorkflowService.class);
    private final MockMvc mockMvc = standaloneSetup(new ApplicationController(workflowService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    void submitApplicationReturnsCreatedWorkflowState() throws Exception {
        UUID applicationId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        when(workflowService.submit(any(), any(), any())).thenReturn(new ApplicationResponse(applicationId, jobId,
                UUID.randomUUID(), UUID.randomUUID(), candidateId, "Senior Java", "https://cv.example/cv.pdf",
                "Hello", ApplicationStatus.SUBMITTED, Instant.parse("2026-05-02T00:00:00Z"),
                Instant.parse("2026-05-02T00:00:00Z")));

        mockMvc.perform(post("/jobs/{jobId}/applications", jobId)
                        .header(AppHeaders.USER_ID, candidateId)
                        .header(AppHeaders.USER_EMAIL, "candidate@example.com")
                        .header(AppHeaders.USER_ROLE, UserRole.CANDIDATE.name())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new SubmitApplicationRequest("https://cv.example/cv.pdf", "Hello"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id", is(applicationId.toString())))
                .andExpect(jsonPath("$.data.status", is("SUBMITTED")));
    }

    @Test
    void submitApplicationRejectsMissingCv() throws Exception {
        UUID candidateId = UUID.randomUUID();
        mockMvc.perform(post("/jobs/{jobId}/applications", UUID.randomUUID())
                        .header(AppHeaders.USER_ID, candidateId)
                        .header(AppHeaders.USER_EMAIL, "candidate@example.com")
                        .header(AppHeaders.USER_ROLE, UserRole.CANDIDATE.name())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "coverLetter": "Hello"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("VALIDATION_ERROR")));
    }
}

