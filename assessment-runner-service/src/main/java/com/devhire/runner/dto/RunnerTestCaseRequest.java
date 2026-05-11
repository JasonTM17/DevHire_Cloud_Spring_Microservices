package com.devhire.runner.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.UUID;

public record RunnerTestCaseRequest(
        @NotNull UUID id,
        @NotBlank String name,
        @NotBlank String visibility,
        String input,
        String stdin,
        String expectedOutput,
        String setupSql,
        String expectedRowsJson,
        @PositiveOrZero int weight,
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
