package com.devhire.job.controller;

import com.devhire.common.ApiResponse;
import com.devhire.job.dto.response.SkillAnalyticsResponse;
import com.devhire.job.service.JobAnalyticsService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CandidateJobAnalyticsController {
    private final JobAnalyticsService analyticsService;

    public CandidateJobAnalyticsController(JobAnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/candidate/skill-analytics")
    public ApiResponse<SkillAnalyticsResponse> skillAnalytics() {
        return ApiResponse.ok(analyticsService.candidateSkillAnalytics());
    }
}
