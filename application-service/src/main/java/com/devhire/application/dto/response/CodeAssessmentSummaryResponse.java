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
        double acceptedRate,
        double wrongAnswerRate,
        double compileErrorRate,
        double timeoutRate,
        double runnerUnavailableRate,
        double policyBlockedRate,
        double averageRuntimeMs,
        double p95ExecutionMs,
        double averageIntegrityRisk,
        double averageSimilarityScore,
        List<StatusCountResponse> statusDistribution,
        CodeAssessmentRunnerHealthResponse runnerHealth
) {
    public CodeAssessmentSummaryResponse(long totalAssignments,
                                         long submitted,
                                         long autoReviewed,
                                         long employerReviewed,
                                         long passed,
                                         long failed,
                                         double averageScore,
                                         long riskySubmissions,
                                         long runQueueDepth,
                                         double sandboxFailureRate,
                                         double acceptedRate,
                                         double wrongAnswerRate,
                                         double compileErrorRate,
                                         double timeoutRate,
                                         double runnerUnavailableRate,
                                         double policyBlockedRate,
                                         double averageRuntimeMs,
                                         double p95ExecutionMs,
                                         double averageIntegrityRisk,
                                         double averageSimilarityScore,
                                         List<StatusCountResponse> statusDistribution) {
        this(totalAssignments, submitted, autoReviewed, employerReviewed, passed, failed, averageScore,
                riskySubmissions, runQueueDepth, sandboxFailureRate, acceptedRate, wrongAnswerRate, compileErrorRate,
                timeoutRate, runnerUnavailableRate, policyBlockedRate, averageRuntimeMs, p95ExecutionMs,
                averageIntegrityRisk, averageSimilarityScore, statusDistribution,
                CodeAssessmentRunnerHealthResponse.unknown(runQueueDepth));
    }

    public CodeAssessmentSummaryResponse(long totalAssignments,
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
                                         List<StatusCountResponse> statusDistribution) {
        this(totalAssignments, submitted, autoReviewed, employerReviewed, passed, failed, averageScore,
                riskySubmissions, runQueueDepth, sandboxFailureRate, 0, 0, 0, 0, 0, 0, 0, 0,
                averageIntegrityRisk, averageSimilarityScore, statusDistribution,
                CodeAssessmentRunnerHealthResponse.unknown(runQueueDepth));
    }
}
