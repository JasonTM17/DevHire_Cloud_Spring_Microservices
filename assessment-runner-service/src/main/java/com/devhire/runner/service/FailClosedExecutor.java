package com.devhire.runner.service;

import com.devhire.runner.config.AssessmentRunnerProperties;
import com.devhire.runner.dto.RunnerRunRequest;
import com.devhire.runner.dto.RunnerRunResponse;

final class FailClosedExecutor implements SandboxExecutor {
    private final AssessmentRunnerProperties properties;
    private final String reason;

    FailClosedExecutor(AssessmentRunnerProperties properties, String reason) {
        this.properties = properties;
        this.reason = reason;
    }

    @Override
    public RunnerRunResponse run(RunnerRunRequest request) {
        return RunnerResponses.unavailable(request,
                new RunnerLimits(
                        request.timeLimitMs() == null ? properties.getDefaultTimeLimitMs() : request.timeLimitMs(),
                        request.memoryLimitKb() == null ? properties.getDefaultMemoryKb() : request.memoryLimitKb()),
                reason,
                properties.getRunnerVersion());
    }
}
