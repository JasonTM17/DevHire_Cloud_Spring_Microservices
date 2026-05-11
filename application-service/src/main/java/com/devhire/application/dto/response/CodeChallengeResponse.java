package com.devhire.application.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CodeChallengeResponse(
        UUID id,
        String slug,
        String title,
        int version,
        String level,
        String language,
        String prompt,
        String constraints,
        String starterCode,
        List<String> skills,
        List<String> requiredSignals,
        int maxScore,
        boolean active,
        String referenceSolution,
        int visibleCaseCount,
        int hiddenCaseCount,
        List<CodeChallengeTestCaseResponse> testCases,
        Instant createdAt
) {
}
