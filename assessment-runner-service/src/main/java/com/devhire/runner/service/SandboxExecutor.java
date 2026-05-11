package com.devhire.runner.service;

import com.devhire.runner.dto.RunnerRunRequest;
import com.devhire.runner.dto.RunnerRunResponse;

interface SandboxExecutor {
    RunnerRunResponse run(RunnerRunRequest request);
}
