package com.devhire.application.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CodeAssessmentResponse(
        UUID id,
        UUID applicationId,
        String candidateName,
        String jobTitle,
        String challengeTitle,
        String level,
        String language,
        String prompt,
        String constraints,
        String starterCode,
        String status,
        int maxScore,
        Integer latestScore,
        String latestDecision,
        List<String> skills,
        List<RubricScoreResponse> rubric,
        List<String> riskFlags,
        String feedback,
        boolean aiFeedbackFallback,
        String submittedCode,
        Instant dueAt,
        Instant assignedAt,
        Instant submittedAt
) {
}
