package com.devhire.job.client;

import com.devhire.job.client.dto.CompanyInternalResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(name = "company-service", url = "${company-service.url}")
public interface CompanyClient {
    @GetMapping("/internal/companies/{id}")
    CompanyInternalResponse getCompany(@PathVariable UUID id);
}

