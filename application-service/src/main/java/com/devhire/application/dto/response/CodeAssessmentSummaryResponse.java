package com.devhire.application.dto.response;

import java.util.List;

public record CodeAssessmentSummaryResponse(
        long totalAssignments,
        long submitted,
        long autoReviewed,
        long employerReviewed,
        long passed,
        long failed,
        double averageScore,
        long riskySubmissions,
        long runQueueDepth,
        double sandboxFailureRate,
        double averageIntegrityRisk,
        double averageSimilarityScore,
        List<StatusCountResponse> statusDistribution
) {
}
