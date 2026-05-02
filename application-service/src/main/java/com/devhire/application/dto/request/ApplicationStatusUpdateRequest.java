package com.devhire.application.dto.request;

import com.devhire.application.entity.ApplicationStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ApplicationStatusUpdateRequest(
        @NotNull ApplicationStatus status,
        @Size(max = 500) String note
) {
}

