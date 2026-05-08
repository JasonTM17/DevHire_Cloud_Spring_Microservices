package com.devhire.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CodeRunRequest(
        @NotBlank @Size(max = 32) String language,
        @NotBlank @Size(min = 40, max = 12000) String code,
        @Valid List<CodeIntegrityEventRequest> integrityEvents,
        @Size(max = 96) String clientFingerprintHash,
        Integer elapsedSeconds
) {
}
