package com.devhire.company.mapper;

import com.devhire.company.dto.response.CompanyInternalResponse;
import com.devhire.company.dto.response.CompanyResponse;
import com.devhire.company.entity.Company;
import com.devhire.company.entity.CompanyStatus;
import org.springframework.stereotype.Component;

@Component
public class CompanyMapper {
    public CompanyResponse toResponse(Company company) {
        return new CompanyResponse(
                company.getId(),
                company.getEmployerId(),
                company.getName(),
                company.getSlug(),
                company.getLogoUrl(),
                company.getWebsite(),
                company.getSize(),
                company.getIndustry(),
                company.getDescription(),
                company.getStatus(),
                company.getRejectionReason(),
                company.getCreatedAt(),
                company.getUpdatedAt()
        );
    }

    public CompanyInternalResponse toInternal(Company company) {
        return new CompanyInternalResponse(
                company.getId(),
                company.getEmployerId(),
                company.getStatus(),
                company.getStatus() == CompanyStatus.APPROVED
        );
    }
}

