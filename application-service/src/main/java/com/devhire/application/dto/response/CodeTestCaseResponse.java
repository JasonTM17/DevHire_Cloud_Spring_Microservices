package com.devhire.application.dto.response;

import java.util.UUID;

public record CodeTestCaseResponse(
        UUID id,
        String name,
        String visibility,
        String input,
        int weight
) {
}
