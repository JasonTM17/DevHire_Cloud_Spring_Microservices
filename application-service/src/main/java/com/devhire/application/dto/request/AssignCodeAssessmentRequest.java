package com.devhire.application.dto.request;

import jakarta.validation.constraints.Future;

import java.time.Instant;
import java.util.UUID;

public record AssignCodeAssessmentRequest(
        UUID challengeId,
        @Future Instant dueAt
) {
}
