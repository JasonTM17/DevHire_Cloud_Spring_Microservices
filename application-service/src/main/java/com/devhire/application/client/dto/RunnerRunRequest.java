package com.devhire.application.client.dto;

import java.util.List;

public record RunnerRunRequest(
        String language,
        String code,
        List<RunnerTestCaseRequest> testCases,
        Integer timeLimitMs,
        Integer memoryLimitKb,
        Integer maxOutputBytes
) {
    public RunnerRunRequest(String language, String code, List<RunnerTestCaseRequest> testCases) {
        this(language, code, testCases, null, null, null);
    }
}
