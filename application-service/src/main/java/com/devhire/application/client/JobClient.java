package com.devhire.application.client;

import com.devhire.application.client.dto.JobInternalResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(name = "job-service", url = "${job-service.url}")
public interface JobClient {
    @GetMapping("/internal/jobs/{id}")
    JobInternalResponse getJob(@PathVariable UUID id);
}

