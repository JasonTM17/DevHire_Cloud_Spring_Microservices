package com.devhire.application.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CodeChallengeTestCaseRequest(
        @NotBlank @Size(max = 160) String name,
        @NotBlank @Size(max = 16) String visibility,
        String stdin,
        @NotBlank String expectedOutput,
        @Min(1) @Max(100) Integer weight,
        @Min(0) Integer ordinal,
        String setupSql,
        String expectedRowsJson
) {
}
