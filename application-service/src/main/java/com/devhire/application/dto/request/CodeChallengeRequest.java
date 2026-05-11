package com.devhire.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CodeChallengeRequest(
        @Size(max = 120) String slug,
        @Size(max = 180) String title,
        @Size(max = 64) String level,
        @Size(max = 64) String language,
        String prompt,
        String constraints,
        String starterCode,
        List<@Size(max = 80) String> skills,
        List<@Size(max = 120) String> requiredSignals,
        @Min(1) @Max(100) Integer maxScore,
        Boolean active,
        String referenceSolution,
        @Valid List<CodeChallengeTestCaseRequest> testCases
) {
}
