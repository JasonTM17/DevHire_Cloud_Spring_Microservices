package com.devhire.application.client.dto;

import java.util.List;

public record RunnerRunRequest(
        String language,
        String code,
        List<RunnerTestCaseRequest> testCases
) {
}
