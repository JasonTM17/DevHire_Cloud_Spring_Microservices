package com.devhire.runner.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.UUID;

public record RunnerTestCaseRequest(
        @NotNull UUID id,
        @NotBlank String name,
        @NotBlank String visibility,
        String input,
        @NotBlank String expectedOutput,
        @Positive int weight
) {
}
