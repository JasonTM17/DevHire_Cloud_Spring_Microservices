package com.devhire.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CodeSubmissionRequest(
        @NotBlank @Size(max = 32) String language,
        @NotBlank @Size(min = 40, max = 12000) String code,
        @Size(max = 1200) String notes,
        List<CodeIntegrityEventRequest> integrityEvents,
        @Size(max = 96) String clientFingerprintHash,
        Integer elapsedSeconds
) {
    public CodeSubmissionRequest(String language, String code, String notes) {
        this(language, code, notes, List.of(), null, null);
    }
}
