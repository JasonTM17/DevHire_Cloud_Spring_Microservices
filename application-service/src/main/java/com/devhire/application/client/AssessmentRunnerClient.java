package com.devhire.application.client;

import com.devhire.application.client.dto.RunnerRunRequest;
import com.devhire.application.client.dto.RunnerRunResponse;
import com.devhire.common.ApiResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "assessment-runner-service", url = "${assessment-runner-service.url}")
public interface AssessmentRunnerClient {
    @PostMapping("/internal/assessment-runs")
    ApiResponse<RunnerRunResponse> run(@RequestBody RunnerRunRequest request);
}
