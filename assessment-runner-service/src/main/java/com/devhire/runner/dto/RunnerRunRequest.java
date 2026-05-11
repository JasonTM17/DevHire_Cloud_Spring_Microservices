package com.devhire.runner.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RunnerRunRequest(
        @NotBlank @Size(max = 32) String language,
        @NotBlank @Size(min = 40, max = 12000) String code,
        @Valid @NotEmpty List<RunnerTestCaseRequest> testCases,
        Integer timeLimitMs,
        Integer memoryLimitKb,
        Integer maxOutputBytes
) {
    public RunnerRunRequest(String language, String code, List<RunnerTestCaseRequest> testCases) {
        this(language, code, testCases, null, null, null);
    }
}
