package com.devhire.application.client.dto;

import java.util.UUID;

public record RunnerTestCaseRequest(
        UUID id,
        String name,
        String visibility,
        String input,
        String stdin,
        String expectedOutput,
        String setupSql,
        String expectedRowsJson,
        int weight,
        Integer timeLimitMs,
        Integer memoryLimitKb
) {
    public RunnerTestCaseRequest(UUID id,
                                 String name,
                                 String visibility,
                                 String input,
                                 String expectedOutput,
                                 int weight) {
        this(id, name, visibility, input, input, expectedOutput, null, null, weight, null, null);
    }
}
