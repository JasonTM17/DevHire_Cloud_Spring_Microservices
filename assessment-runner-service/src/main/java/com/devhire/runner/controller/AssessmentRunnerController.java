package com.devhire.runner.controller;

import com.devhire.common.ApiResponse;
import com.devhire.runner.dto.RunnerHealthResponse;
import com.devhire.runner.dto.RunnerRunRequest;
import com.devhire.runner.dto.RunnerRunResponse;
import com.devhire.runner.service.AssessmentRunnerService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AssessmentRunnerController {
    private final AssessmentRunnerService service;

    public AssessmentRunnerController(AssessmentRunnerService service) {
        this.service = service;
    }

    @PostMapping("/internal/assessment-runs")
    public ApiResponse<RunnerRunResponse> run(@Valid @RequestBody RunnerRunRequest request) {
        return ApiResponse.ok(service.run(request));
    }

    @GetMapping("/internal/assessment-runs/health")
    public ApiResponse<RunnerHealthResponse> health() {
        return ApiResponse.ok(service.health());
    }
}
