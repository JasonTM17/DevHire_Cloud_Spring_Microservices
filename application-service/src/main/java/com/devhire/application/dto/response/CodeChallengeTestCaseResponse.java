package com.devhire.application.dto.response;

import java.util.UUID;

public record CodeChallengeTestCaseResponse(
        UUID id,
        String name,
        String visibility,
        String stdin,
        String expectedOutput,
        int weight,
        int ordinal,
        String setupSql,
        String expectedRowsJson
) {
}
