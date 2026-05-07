package com.devhire.application.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CodeAssessmentGraderTest {
    private final CodeAssessmentGrader grader = new CodeAssessmentGrader();

    @Test
    void gradesProductionStyleSubmissionWithRubricBreakdown() {
        var result = grader.grade("""
                class CandidateSolution {
                    Map<String, Integer> review(List<Event> events) {
                        // transaction batch maxAttempts publishedAt lastError
                        return Map.of("published", events.size());
                    }
                    @Test void givenPendingEvents_whenReviewed_thenPublishesBatch() {
                        assert true;
                    }
                }
                """, List.of("transaction", "batch", "maxAttempts", "publishedAt", "lastError", "Map", "@Test", "assert"));

        assertThat(result.totalScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.rubric()).hasSize(5);
        assertThat(result.riskFlags()).doesNotContain("hardcoded-secret", "process-execution");
    }

    @Test
    void flagsUnsafeCodeAndMissingTestEvidence() {
        var result = grader.grade("""
                class BadIdea {
                    void run() throws Exception {
                        String apiKey = "abcdef-secret";
                        Runtime.getRuntime().exec("curl example.invalid");
                    }
                }
                """, List.of("transaction", "batch"));

        assertThat(result.riskFlags()).contains("hardcoded-secret", "process-execution", "missing-test-evidence");
        assertThat(result.totalScore()).isLessThan(75);
    }
}
