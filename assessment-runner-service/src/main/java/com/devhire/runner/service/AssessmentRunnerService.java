package com.devhire.runner.service;

import com.devhire.runner.config.AssessmentRunnerProperties;
import com.devhire.runner.dto.RunnerHealthResponse;
import com.devhire.runner.dto.RunnerRunRequest;
import com.devhire.runner.dto.RunnerRunResponse;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class AssessmentRunnerService {
    private final MeterRegistry meterRegistry;
    private final AssessmentRunnerProperties properties;
    private final SandboxExecutor executor;
    private final AtomicInteger queueDepth = new AtomicInteger();

    @Autowired
    public AssessmentRunnerService(MeterRegistry meterRegistry, AssessmentRunnerProperties properties) {
        this.meterRegistry = meterRegistry;
        this.properties = properties;
        this.executor = executorFor(properties);
        Gauge.builder("devhire_assessment_runner_queue_depth", queueDepth, AtomicInteger::get)
                .description("In-process assessment runner queue depth")
                .register(meterRegistry);
        Gauge.builder("devhire_assessment_runner_fail_closed", this, AssessmentRunnerService::failClosedGauge)
                .description("Assessment runner fail-closed state; 1 means server-side scoring is unavailable by policy")
                .tag("mode", properties.getMode())
                .register(meterRegistry);
        Gauge.builder("devhire_assessment_runner_judge0_configured", this, AssessmentRunnerService::judge0ConfiguredGauge)
                .description("Whether Judge0 is configured for the active runner mode")
                .tag("mode", properties.getMode())
                .register(meterRegistry);
    }

    public AssessmentRunnerService(MeterRegistry meterRegistry) {
        this(meterRegistry, deterministicProperties());
    }

    public RunnerRunResponse run(RunnerRunRequest request) {
        Timer.Sample timer = Timer.start(meterRegistry);
        queueDepth.incrementAndGet();
        try {
            RunnerRunResponse response = executor.run(request);
            meterRegistry.counter("devhire_assessment_runner_requests_total",
                    "language", normalizeLanguage(request.language()),
                    "status", safeTag(response.status()),
                    "verdict", safeTag(response.verdict())).increment();
            if ("POLICY_BLOCKED".equals(response.verdict()) || "RUNNER_UNAVAILABLE".equals(response.verdict())) {
                meterRegistry.counter("devhire_assessment_runner_sandbox_failures_total",
                        "reason", safeTag(response.verdict())).increment();
            }
            return response;
        } finally {
            queueDepth.decrementAndGet();
            timer.stop(Timer.builder("devhire_assessment_runner_latency_seconds")
                    .tag("language", normalizeLanguage(request.language()))
                    .publishPercentileHistogram()
                    .register(meterRegistry));
        }
    }

    public RunnerHealthResponse health() {
        boolean judge0Configured = !properties.getJudge0BaseUrl().isBlank();
        String failClosedReason = properties.getMode().equals("judge0") && !judge0Configured
                ? "Judge0 runtime is not configured; server-side scoring failed closed."
                : properties.getMode().equals("fail-closed")
                ? "Assessment runtime is intentionally disabled."
                : null;
        boolean failClosed = failClosedReason != null || properties.getMode().equals("fail-closed");
        String status = failClosedReason == null ? "UP" : "DOWN";
        return new RunnerHealthResponse(
                status,
                properties.getMode(),
                properties.getRunnerVersion(),
                judge0Configured,
                failClosed,
                properties.isNetworkDisabled(),
                queueDepth.get(),
                failClosedReason,
                Instant.now());
    }

    private static SandboxExecutor executorFor(AssessmentRunnerProperties properties) {
        return switch (properties.getMode()) {
            case "judge0" -> properties.getJudge0BaseUrl().isBlank()
                    ? new FailClosedExecutor(properties, "Judge0 runtime is not configured; server-side scoring failed closed.")
                    : new Judge0SandboxExecutor(properties);
            case "fail-closed" -> new FailClosedExecutor(properties, "Assessment runtime is intentionally disabled.");
            default -> new DeterministicSignalExecutor(properties);
        };
    }

    private static AssessmentRunnerProperties deterministicProperties() {
        AssessmentRunnerProperties properties = new AssessmentRunnerProperties();
        properties.setMode("deterministic");
        return properties;
    }

    private double failClosedGauge() {
        if (properties.getMode().equals("fail-closed")) {
            return 1.0;
        }
        return properties.getMode().equals("judge0") && properties.getJudge0BaseUrl().isBlank() ? 1.0 : 0.0;
    }

    private double judge0ConfiguredGauge() {
        return properties.getJudge0BaseUrl().isBlank() ? 0.0 : 1.0;
    }

    private static String normalizeLanguage(String language) {
        return language == null || language.isBlank() ? "unknown" : language.trim().toLowerCase(Locale.ROOT);
    }

    private static String safeTag(String value) {
        return value == null || value.isBlank() ? "unknown" : value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9_\\-]+", "_");
    }
}
