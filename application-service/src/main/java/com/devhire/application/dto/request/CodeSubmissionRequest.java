package com.devhire.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CodeSubmissionRequest(
        @NotBlank @Size(max = 32) String language,
        @NotBlank @Size(min = 40, max = 12000) String code,
        @Size(max = 1200) String notes
) {
}
