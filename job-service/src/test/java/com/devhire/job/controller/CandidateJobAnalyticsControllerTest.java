package com.devhire.job.controller;

import com.devhire.common.web.GlobalExceptionHandler;
import com.devhire.job.dto.response.LevelDemandResponse;
import com.devhire.job.dto.response.LocationDemandResponse;
import com.devhire.job.dto.response.SkillAnalyticsResponse;
import com.devhire.job.dto.response.SkillDemandResponse;
import com.devhire.job.service.JobAnalyticsService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class CandidateJobAnalyticsControllerTest {
    private final JobAnalyticsService analyticsService = mock(JobAnalyticsService.class);
    private final MockMvc mockMvc = standaloneSetup(new CandidateJobAnalyticsController(analyticsService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    void skillAnalyticsReturnsDemandSignalsForCandidateUx() throws Exception {
        when(analyticsService.candidateSkillAnalytics()).thenReturn(new SkillAnalyticsResponse(
                150, 4200, 7200,
                List.of(new SkillDemandResponse("Kafka", 48)),
                List.of(new LocationDemandResponse("Ho Chi Minh City", 42)),
                List.of(new LevelDemandResponse("Senior", 80))));

        mockMvc.perform(get("/candidate/skill-analytics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.publishedJobs", is(150)))
                .andExpect(jsonPath("$.data.topSkills[0].skill", is("Kafka")))
                .andExpect(jsonPath("$.data.topLocations[0].location", is("Ho Chi Minh City")))
                .andExpect(jsonPath("$.data.levelDistribution[0].level", is("Senior")));
    }
}
