package com.devhire.runner.service;

import com.devhire.runner.dto.RunnerRunRequest;
import com.devhire.runner.dto.RunnerTestCaseRequest;
import com.devhire.runner.config.AssessmentRunnerProperties;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AssessmentRunnerServiceTest {
    private final AssessmentRunnerService service = new AssessmentRunnerService(new SimpleMeterRegistry());

    @Test
    void deterministicPreviewMatchesJavaSolveContractOutput() {
        var response = service.run(new RunnerRunRequest("Java", """
                class CandidateSolution {
                    String solve(String input) {
                        EnterpriseSecurityPolicy policy = EnterpriseSecurityPolicy.STRICT;
                        String requiredTag = "production";
                        return policy == EnterpriseSecurityPolicy.STRICT
                                && input.contains("policy=STRICT")
                                && input.contains("tag=" + requiredTag)
                                ? "PASSED"
                                : "REJECTED";
                    }
                }
                enum EnterpriseSecurityPolicy { STRICT }
                """, List.of(new RunnerTestCaseRequest(UUID.randomUUID(), "Batch boundary", "VISIBLE",
                "resource=res-9982;policy=STRICT;tag=production", "PASSED", 10))));

        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.passed()).isEqualTo(1);
        assertThat(response.sandboxStatus()).isEqualTo("DETERMINISTIC_LOCAL_PREVIEW");
        assertThat(response.verdict()).isEqualTo("ACCEPTED");
        assertThat(response.runnerVersion()).isEqualTo("devhire-runtime-v0.7");
    }

    @Test
    void deterministicPreviewReportsWrongAnswerForMismatchedOutput() {
        var response = service.run(new RunnerRunRequest("Java", """
                class CandidateSolution {
                    String solve(String input) { return "PASSED"; }
                }
                """, List.of(new RunnerTestCaseRequest(UUID.randomUUID(), "Strict policy", "HIDDEN",
                "resource=res-2211;policy=RELAXED;tag=production", "REJECTED", 10))));

        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.passed()).isZero();
        assertThat(response.results().getFirst().passed()).isFalse();
        assertThat(response.results().getFirst().verdict()).isEqualTo("WRONG_ANSWER");
    }

    @Test
    void deterministicPreviewSupportsCustomInputWithoutExpectedOutput() {
        var response = service.run(new RunnerRunRequest("Java", """
                class CandidateSolution {
                    String solve(String input) {
                        return input.contains("tag=production") ? "PASSED" : "REJECTED";
                    }
                }
                """, List.of(new RunnerTestCaseRequest(UUID.randomUUID(), "Custom input", "VISIBLE",
                "resource=res-verification;policy=STRICT;tag=production", "", 0))));

        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.passed()).isEqualTo(1);
        assertThat(response.verdict()).isEqualTo("ACCEPTED");
        assertThat(response.results().getFirst().passed()).isTrue();
        assertThat(response.results().getFirst().error()).isNull();
    }

    @Test
    void sandboxBlocksProcessNetworkAndFilesystemBoundaries() {
        var response = service.run(new RunnerRunRequest("Java", """
                class Solution {
                    void review() { Runtime.getRuntime().exec("curl example.com"); }
                }
                """, List.of(new RunnerTestCaseRequest(UUID.randomUUID(), "No process", "HIDDEN",
                "events", "transaction", 10))));

        assertThat(response.status()).isEqualTo("POLICY_BLOCKED");
        assertThat(response.verdict()).isEqualTo("POLICY_BLOCKED");
        assertThat(response.failureReason()).contains("blocked");
        assertThat(response.passed()).isZero();
    }

    @Test
    void deterministicPreviewIgnoresExpectedOutputStuffedIntoStringsAndComments() {
        var response = service.run(new RunnerRunRequest("Java", """
                class CandidateSolution {
                    // PASSED
                    String copiedVisibleAnswer = "PASSED";
                    String solve(String input) { return "REJECTED"; }
                }
                """, List.of(new RunnerTestCaseRequest(UUID.randomUUID(), "No token stuffing", "VISIBLE",
                "resource=res-9982;policy=STRICT;tag=production", "PASSED", 10))));

        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.passed()).isZero();
        assertThat(response.results().getFirst().passed()).isFalse();
    }

    @Test
    void sandboxBlocksBroaderFileAndNetworkBoundaries() {
        var response = service.run(new RunnerRunRequest("Java", """
                import java.nio.file.Files;
                class Solution {
                    void review() throws Exception { Files.readString(Path.of("/etc/passwd")); }
                }
                """, List.of(new RunnerTestCaseRequest(UUID.randomUUID(), "No filesystem", "HIDDEN",
                "events", "transaction", 10))));

        assertThat(response.status()).isEqualTo("POLICY_BLOCKED");
        assertThat(response.failureReason()).contains("blocked");
    }

    @Test
    void sandboxBlocksPackageAndPublicCandidateSolutionContractViolations() {
        var response = service.run(new RunnerRunRequest("Java", """
                package demo;
                public class CandidateSolution {
                    String solve(String input) { return "PASSED"; }
                }
                """, List.of(new RunnerTestCaseRequest(UUID.randomUUID(), "Contract", "VISIBLE",
                "input", "PASSED", 10))));

        assertThat(response.status()).isEqualTo("POLICY_BLOCKED");
        assertThat(response.verdict()).isEqualTo("POLICY_BLOCKED");
    }

    @Test
    void judge0ModeFailsClosedWhenRuntimeIsNotConfigured() {
        AssessmentRunnerProperties properties = new AssessmentRunnerProperties();
        properties.setMode("judge0");
        var judgeService = new AssessmentRunnerService(new SimpleMeterRegistry(), properties);

        var response = judgeService.run(new RunnerRunRequest("Java", """
                class CandidateSolution {
                    String solve(String input) { return "PASSED"; }
                }
                """, List.of(new RunnerTestCaseRequest(UUID.randomUUID(), "No runtime", "VISIBLE",
                "input", "PASSED", 10))));

        assertThat(response.status()).isEqualTo("FAILED");
        assertThat(response.verdict()).isEqualTo("RUNNER_UNAVAILABLE");
        assertThat(response.failureReason()).contains("not configured");
        assertThat(judgeService.health().status()).isEqualTo("DOWN");
        assertThat(judgeService.health().failClosed()).isTrue();
        assertThat(judgeService.health().mode()).isEqualTo("judge0");
    }

    @Test
    void healthMetricsExposeFailClosedAndJudge0ConfigurationState() {
        AssessmentRunnerProperties properties = new AssessmentRunnerProperties();
        properties.setMode("judge0");
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        new AssessmentRunnerService(registry, properties);

        assertThat(registry.find("devhire_assessment_runner_fail_closed").gauge()).isNotNull();
        assertThat(registry.find("devhire_assessment_runner_fail_closed").gauge().value()).isEqualTo(1.0);
        assertThat(registry.find("devhire_assessment_runner_judge0_configured").gauge()).isNotNull();
        assertThat(registry.find("devhire_assessment_runner_judge0_configured").gauge().value()).isZero();
    }
}
