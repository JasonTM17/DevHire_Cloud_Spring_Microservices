package com.devhire.ai.controller;

import com.devhire.ai.dto.CandidateRoadmapResponse;
import com.devhire.ai.dto.InterviewPrepResponse;
import com.devhire.ai.service.CandidateAiReadModelService;
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
public class CandidateAiController {
    private final CandidateAiReadModelService readModelService;

    public CandidateAiController(CandidateAiReadModelService readModelService) {
        this.readModelService = readModelService;
    }

    @GetMapping("/candidate/roadmap")
    public ApiResponse<CandidateRoadmapResponse> roadmap(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                         @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                         @RequestHeader(AppHeaders.USER_ROLE) UserRole role) {
        return ApiResponse.ok(readModelService.roadmap(new AuthenticatedUser(userId, email, role)));
    }

    @GetMapping("/candidate/interview-prep")
    public ApiResponse<List<InterviewPrepResponse>> interviewPrep(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                  @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                  @RequestHeader(AppHeaders.USER_ROLE) UserRole role) {
        return ApiResponse.ok(readModelService.interviewPrep(new AuthenticatedUser(userId, email, role)));
    }
}
