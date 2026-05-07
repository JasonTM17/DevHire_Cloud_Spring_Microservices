package com.devhire.job.dto.request;

import java.math.BigDecimal;
import java.util.UUID;

public record JobSearchCriteria(
        String keyword,
        String skill,
        String location,
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String level,
        String type,
        UUID companyId
) {
}
