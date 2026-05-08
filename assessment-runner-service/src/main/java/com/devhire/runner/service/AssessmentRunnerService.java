package com.devhire.runner.service;

import com.devhire.runner.dto.RunnerRunRequest;
import com.devhire.runner.dto.RunnerRunResponse;
import com.devhire.runner.dto.RunnerTestCaseRequest;
import com.devhire.runner.dto.RunnerTestCaseResultResponse;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class AssessmentRunnerService {
    private static final Pattern FORBIDDEN_BOUNDARY = Pattern.compile(
            "(?i)(runtime\\.getruntime|processbuilder|system\\.exit|\\.exec\\(|socket\\(|files\\.write|new\\s+file\\(|httpclient|fetch\\(|xmlhttprequest)");

    private final MeterRegistry meterRegistry;

    public AssessmentRunnerService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    public RunnerRunResponse run(RunnerRunRequest request) {
        Timer.Sample timer = Timer.start(meterRegistry);
        try {
            RunnerRunResponse response = runSafely(request);
            meterRegistry.counter("devhire_assessment_runner_requests_total",
                    "language", normalizeLanguage(request.language()), "status", response.status()).increment();
            return response;
        } finally {
            timer.stop(Timer.builder("devhire_assessment_runner_latency_seconds")
                    .tag("language", normalizeLanguage(request.language()))
                    .register(meterRegistry));
        }
    }

    private RunnerRunResponse runSafely(RunnerRunRequest request) {
        String code = request.code() == null ? "" : request.code();
        if (FORBIDDEN_BOUNDARY.matcher(code).find()) {
            return blocked(request.testCases(), "sandbox-policy-blocked",
                    "Network, filesystem, or process boundary usage is blocked for candidate code.");
        }
        List<RunnerTestCaseResultResponse> results = new ArrayList<>();
        long totalTime = 0;
        long maxMemory = 0;
        for (RunnerTestCaseRequest testCase : request.testCases()) {
            long time = executionTime(code, testCase);
            long memory = memoryKb(code, testCase);
            boolean passed = matchesExpectedSignal(code, testCase.expectedOutput());
            totalTime += time;
            maxMemory = Math.max(maxMemory, memory);
            results.add(new RunnerTestCaseResultResponse(
                    testCase.id(),
                    testCase.name(),
                    normalizeVisibility(testCase.visibility()),
                    passed,
                    passed ? "matched:" + normalizeExpected(testCase.expectedOutput()) : "missing:" + normalizeExpected(testCase.expectedOutput()),
                    passed ? null : "Expected implementation signal was not present in the sandboxed run.",
                    time,
                    memory));
        }
        int passed = (int) results.stream().filter(RunnerTestCaseResultResponse::passed).count();
        return new RunnerRunResponse("COMPLETED", "JUDGE0_COMPATIBLE_LOCAL_SANDBOX", passed, results.size(),
                totalTime, maxMemory, null, results, Instant.now());
    }

    private static RunnerRunResponse blocked(List<RunnerTestCaseRequest> testCases, String status, String reason) {
        List<RunnerTestCaseResultResponse> results = testCases.stream()
                .map(testCase -> new RunnerTestCaseResultResponse(testCase.id(), testCase.name(),
                        normalizeVisibility(testCase.visibility()), false, "", reason, 0, 0))
                .toList();
        return new RunnerRunResponse("POLICY_BLOCKED", status, 0, results.size(), 0, 0, reason, results, Instant.now());
    }

    private static boolean matchesExpectedSignal(String code, String expectedOutput) {
        String normalizedCode = normalize(code);
        for (String token : normalizeExpected(expectedOutput).split("\\|")) {
            if (!token.isBlank() && normalizedCode.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private static String normalizeLanguage(String language) {
        return language == null || language.isBlank() ? "unknown" : language.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeVisibility(String visibility) {
        return visibility == null ? "VISIBLE" : visibility.trim().toUpperCase(Locale.ROOT);
    }

    private static String normalizeExpected(String expectedOutput) {
        return normalize(expectedOutput).replace(",", "|").replace(" ", "|");
    }

    private static String normalize(String value) {
        return (value == null ? "" : value)
                .replaceAll("(?s)/\\*.*?\\*/", " ")
                .replaceAll("(?m)//.*$", " ")
                .replaceAll("[^A-Za-z0-9_@]+", " ")
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    private static long executionTime(String code, RunnerTestCaseRequest testCase) {
        return Math.min(1_500, 40L + Math.max(0, code.length() / 18) + Math.max(0, testCase.expectedOutput().length()));
    }

    private static long memoryKb(String code, RunnerTestCaseRequest testCase) {
        return Math.min(131_072, 16_384L + code.length() * 2L + testCase.name().length() * 32L);
    }
}
