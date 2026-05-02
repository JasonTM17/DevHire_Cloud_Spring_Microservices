package com.devhire.job.dto.request;

import jakarta.validation.constraints.Size;

public record JobRejectRequest(@Size(max = 500) String reason) {
}

