package com.devhire.application.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CodeReviewRequest(
        @NotBlank @Size(max = 32) String decision,
        @Size(max = 1000) String note,
        @Min(0) @Max(100) Integer finalScore
) {
}
