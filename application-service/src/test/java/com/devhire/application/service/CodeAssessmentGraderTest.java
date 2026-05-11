package com.devhire.application.service;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CodeAssessmentGraderTest {
    private final CodeAssessmentGrader grader = new CodeAssessmentGrader();

    @Test
    void gradesLeetCodeStyleSolveSubmissionWithRubricBreakdown() {
        var result = grader.grade("""
                class CandidateSolution {
                    String solve(String input) {
                        ResourceValidator validator = new ResourceValidator(EnterpriseSecurityPolicy.STRICT, "production");
                        return validator.validate(input) ? "PASSED" : "REJECTED";
                    }
                }
                enum EnterpriseSecurityPolicy { STRICT }
                class ResourceValidator {
                    private final EnterpriseSecurityPolicy policy;
                    private final String requiredTag;
                    ResourceValidator(EnterpriseSecurityPolicy policy, String requiredTag) {
                        this.policy = policy;
                        this.requiredTag = requiredTag;
                    }
                    boolean validate(String input) {
                        return policy == EnterpriseSecurityPolicy.STRICT
                                && input != null
                                && input.contains("policy=STRICT")
                                && input.contains("tag=" + requiredTag);
                    }
                }
                """, List.of("CandidateSolution", "solve", "ResourceValidator",
                "EnterpriseSecurityPolicy.STRICT", "production", "PASSED", "REJECTED"));

        assertThat(result.totalScore()).isGreaterThanOrEqualTo(80);
        assertThat(result.rubric()).hasSize(5);
        assertThat(result.riskFlags()).doesNotContain("hardcoded-secret", "process-execution");
    }

    @Test
    void flagsUnsafeCodeAndLowSignalSubmission() {
        var result = grader.grade("""
                class BadIdea {
                    void run() throws Exception {
                        String apiKey = "abcdef-secret";
                        Runtime.getRuntime().exec("curl example.invalid");
                    }
                }
                """, List.of("transaction", "batch"));

        assertThat(result.riskFlags()).contains("hardcoded-secret", "process-execution", "low-signal-code");
        assertThat(result.totalScore()).isLessThan(75);
    }

    @Test
    void flagsStarterCodeOnlySubmission() {
        String starter = """
                class CandidateSolution {
                    String solve(String input) {
                        // implement validation
                        return "";
                    }
                }
                """;

        var result = grader.grade(starter, List.of("CandidateSolution", "solve", "PASSED"), starter);

        assertThat(result.riskFlags()).contains("starter-code-only").doesNotContain("low-signal-code");
        assertThat(result.totalScore()).isLessThan(70);
    }

    @Test
    void doesNotRewardJunitOrAssertSignalsForLeetCodeContract() {
        var result = grader.grade("""
                class CandidateSolution {
                    String solve(String input) {
                        assert input != null;
                        return "PASSED";
                    }
                }
                """, List.of("CandidateSolution", "solve"));

        assertThat(result.rubric()).extracting("category")
                .contains("Input parsing and edge cases")
                .doesNotContain("Test and evidence quality");
        assertThat(result.rubric()).extracting("evidence")
                .noneMatch(value -> String.valueOf(value).toLowerCase().contains("assertion"));
    }

    @Test
    void ignoresRequiredSignalsStuffedIntoCommentsAndStrings() {
        var result = grader.grade("""
                class CandidateSolution {
                    // ResourceValidator EnterpriseSecurityPolicy.STRICT production PASSED REJECTED
                    String copiedVisibleAnswer = "ResourceValidator EnterpriseSecurityPolicy.STRICT production PASSED REJECTED";
                    String solve(String input) { return ""; }
                }
                """, List.of("ResourceValidator", "EnterpriseSecurityPolicy.STRICT", "production", "PASSED", "REJECTED"));

        assertThat(result.riskFlags()).contains("non-executable-signal-stuffing");
        assertThat(result.rubric().getFirst().evidence()).contains("0 implementation signals");
        assertThat(result.totalScore()).isLessThan(65);
    }
}
