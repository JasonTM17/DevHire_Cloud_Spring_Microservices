package com.devhire.application.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CodeSubmissionSummaryResponse(
        UUID id,
        UUID assignmentId,
        UUID runId,
        String language,
        Integer finalScore,
        String decision,
        List<RubricScoreResponse> rubric,
        List<String> riskFlags,
        String feedback,
        Integer attemptNumber,
        String codeHash,
        String graderVersion,
        String rubricVersion,
        String submittedCode,
        String submittedCodePreview,
        boolean hasSubmittedCode,
        String verdict,
        int visiblePassed,
        int visibleTotal,
        int hiddenPassed,
        int hiddenTotal,
        long executionTimeMs,
        long memoryKb,
        Instant submittedAt
) {
}
