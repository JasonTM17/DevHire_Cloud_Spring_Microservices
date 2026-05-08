package com.devhire.application.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CodeIntegrityEventRequest(
        @NotBlank @Size(max = 48) String type,
        @Min(1) int count,
        @Size(max = 600) String metadata
) {
}
