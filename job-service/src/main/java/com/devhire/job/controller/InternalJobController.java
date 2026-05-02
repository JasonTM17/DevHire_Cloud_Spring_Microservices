package com.devhire.job.controller;

import com.devhire.job.dto.response.JobInternalResponse;
import com.devhire.job.service.JobService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/internal/jobs")
public class InternalJobController {
    private final JobService jobService;

    public InternalJobController(JobService jobService) {
        this.jobService = jobService;
    }

    @GetMapping("/{id}")
    public JobInternalResponse getInternal(@PathVariable UUID id) {
        return jobService.getInternal(id);
    }
}

