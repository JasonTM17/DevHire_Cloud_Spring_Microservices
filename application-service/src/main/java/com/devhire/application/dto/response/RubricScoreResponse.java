package com.devhire.application.dto.response;

public record RubricScoreResponse(
        String category,
        int score,
        int maxScore,
        String evidence
) {
}
