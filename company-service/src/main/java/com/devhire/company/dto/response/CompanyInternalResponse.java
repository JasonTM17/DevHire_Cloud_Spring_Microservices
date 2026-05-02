package com.devhire.company.dto.response;

import com.devhire.company.entity.CompanyStatus;

import java.util.UUID;

public record CompanyInternalResponse(
        UUID id,
        UUID employerId,
        CompanyStatus status,
        boolean approved
) {
}

