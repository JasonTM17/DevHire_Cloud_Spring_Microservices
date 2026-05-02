package com.devhire.job.dto.request;

import java.math.BigDecimal;

public record JobSearchCriteria(
        String keyword,
        String skill,
        String location,
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String level
) {
}

