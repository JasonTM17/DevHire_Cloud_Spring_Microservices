package com.devhire.runner.service;

import com.devhire.runner.dto.RunnerRunRequest;
import com.devhire.runner.dto.RunnerRunResponse;
import com.devhire.runner.dto.RunnerTestCaseRequest;
import com.devhire.runner.dto.RunnerTestCaseResultResponse;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

final class RunnerResponses {
    private static final String POLICY_REASON = "Network, filesystem, or process boundary usage is blocked for candidate code.";

    private RunnerResponses() {
    }

    static RunnerRunResponse blocked(RunnerRunRequest request, RunnerLimits limits, String runnerVersion) {
        List<RunnerTestCaseResultResponse> results = request.testCases().stream()
                .map(testCase -> new RunnerTestCaseResultResponse(
                        testCase.id(),
                        testCase.name(),
                        normalizeVisibility(testCase.visibility()),
                        false,
                        "POLICY_BLOCKED",
                        "",
                        "",
                        null,
                        null,
                        POLICY_REASON,
                        0,
                        0,
                        limits.timeLimitMs(),
                        limits.memoryLimitKb()))
                .toList();
        return new RunnerRunResponse("POLICY_BLOCKED", "sandbox-policy-blocked", "POLICY_BLOCKED", 0, results.size(),
                0, 0, POLICY_REASON, null, null, null, limits.timeLimitMs(), limits.memoryLimitKb(),
                runnerVersion, results, Instant.now());
    }

    static RunnerRunResponse unavailable(RunnerRunRequest request, RunnerLimits limits, String reason, String runnerVersion) {
        List<RunnerTestCaseResultResponse> results = request.testCases().stream()
                .map(testCase -> new RunnerTestCaseResultResponse(
                        testCase.id(),
                        testCase.name(),
                        normalizeVisibility(testCase.visibility()),
                        false,
                        "RUNNER_UNAVAILABLE",
                        "",
                        "",
                        null,
                        null,
                        reason,
                        0,
                        0,
                        limits.timeLimitMs(),
                        limits.memoryLimitKb()))
                .toList();
        return new RunnerRunResponse("FAILED", "sandbox-runner-unavailable", "RUNNER_UNAVAILABLE", 0, results.size(),
                0, 0, reason, null, null, null, limits.timeLimitMs(), limits.memoryLimitKb(),
                runnerVersion, results, Instant.now());
    }

    static String normalizeVisibility(String visibility) {
        return visibility == null ? "VISIBLE" : visibility.trim().toUpperCase(Locale.ROOT);
    }
}
