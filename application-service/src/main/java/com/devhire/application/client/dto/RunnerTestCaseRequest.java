package com.devhire.application.client.dto;

import java.util.UUID;

public record RunnerTestCaseRequest(
        UUID id,
        String name,
        String visibility,
        String input,
        String expectedOutput,
        int weight
) {
}
