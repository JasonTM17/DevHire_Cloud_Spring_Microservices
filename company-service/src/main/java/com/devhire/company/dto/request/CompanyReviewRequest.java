package com.devhire.company.dto.request;

import jakarta.validation.constraints.Size;

public record CompanyReviewRequest(@Size(max = 500) String reason) {
}

