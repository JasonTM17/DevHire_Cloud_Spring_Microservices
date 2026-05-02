package com.devhire.company.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CompanyCreateRequest(
        @NotBlank @Size(max = 180) String name,
        @Size(max = 500) String logoUrl,
        @Size(max = 500) String website,
        @Size(max = 80) String size,
        @Size(max = 120) String industry,
        @Size(max = 4000) String description
) {
}

