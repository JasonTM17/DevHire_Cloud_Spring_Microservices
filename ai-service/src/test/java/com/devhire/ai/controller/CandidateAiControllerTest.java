package com.devhire.ai.controller;

import com.devhire.ai.dto.CandidateRoadmapResponse;
import com.devhire.ai.dto.InterviewPrepResponse;
import com.devhire.ai.dto.RoadmapMilestoneResponse;
import com.devhire.ai.service.CandidateAiReadModelService;
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

class CandidateAiControllerTest {
    private final CandidateAiReadModelService readModelService = mock(CandidateAiReadModelService.class);
    private final MockMvc mockMvc = standaloneSetup(new CandidateAiController(readModelService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    void roadmapReturnsMilestonesAndPromptSuggestions() throws Exception {
        when(readModelService.roadmap(any())).thenReturn(new CandidateRoadmapResponse(
                "Cloud Platform Engineer Roadmap", "Senior Java Backend", 82,
                List.of(new RoadmapMilestoneResponse("Event-driven architecture", "IN_PROGRESS",
                        "Kafka project evidence", "Prepare design review")),
                List.of("Explain my strongest platform engineering evidence")));

        mockMvc.perform(candidateGet("/candidate/roadmap"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title", is("Cloud Platform Engineer Roadmap")))
                .andExpect(jsonPath("$.data.readinessScore", is(82)))
                .andExpect(jsonPath("$.data.milestones[0].title", is("Event-driven architecture")));
    }

    @Test
    void interviewPrepReturnsRecentAiSessions() throws Exception {
        UUID conversationId = UUID.randomUUID();
        when(readModelService.interviewPrep(any())).thenReturn(List.of(new InterviewPrepResponse(
                conversationId, "Kafka architecture interview", "claude-haiku-4-5-20251001", false,
                Instant.parse("2026-05-05T12:00:00Z"), List.of("Kafka", "Outbox"))));

        mockMvc.perform(candidateGet("/candidate/interview-prep"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].conversationId", is(conversationId.toString())))
                .andExpect(jsonPath("$.data[0].fallback", is(false)))
                .andExpect(jsonPath("$.data[0].focusAreas[0]", is("Kafka")));
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder candidateGet(String path) {
        return get(path)
                .header(AppHeaders.USER_ID, UUID.randomUUID())
                .header(AppHeaders.USER_EMAIL, "candidate@devhire.local")
                .header(AppHeaders.USER_ROLE, UserRole.CANDIDATE.name());
    }
}
