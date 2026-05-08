package com.devhire.runner.service;

import com.devhire.runner.dto.RunnerRunRequest;
import com.devhire.runner.dto.RunnerTestCaseRequest;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AssessmentRunnerServiceTest {
    private final AssessmentRunnerService service = new AssessmentRunnerService(new SimpleMeterRegistry());

    @Test
    void sandboxMatchesExpectedSignalsWithoutExecutingCandidateCode() {
        var response = service.run(new RunnerRunRequest("Java", """
                class Solution {
                    private int maxAttempts = 3;
                    private Object publishedAt;
                    void review() {
                        var transactionBatch = maxAttempts;
                        publishedAt = transactionBatch;
                        assert true;
                    }
                }
                """, List.of(new RunnerTestCaseRequest(UUID.randomUUID(), "Batch boundary", "VISIBLE",
                "events", "transaction,batch", 10))));

        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.passed()).isEqualTo(1);
        assertThat(response.sandboxStatus()).contains("JUDGE0_COMPATIBLE");
    }

    @Test
    void sandboxRequiresAllExpectedSignalsForACase() {
        var response = service.run(new RunnerRunRequest("Java", """
                class Solution {
                    @Test void hasOnlyTestAnnotation() { }
                }
                """, List.of(new RunnerTestCaseRequest(UUID.randomUUID(), "Strict policy", "HIDDEN",
                "resource", "EnterpriseSecurityPolicy.STRICT,@Test,assert", 10))));

        assertThat(response.status()).isEqualTo("COMPLETED");
        assertThat(response.passed()).isZero();
        assertThat(response.results().getFirst().passed()).isFalse();
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
        assertThat(response.failureReason()).contains("blocked");
        assertThat(response.passed()).isZero();
    }
}
