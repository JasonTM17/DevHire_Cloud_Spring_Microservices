package com.devhire.application.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubmitApplicationRequest(
        @NotBlank @Size(max = 500) String cvUrl,
        @Size(max = 2000) String coverLetter
) {
}

