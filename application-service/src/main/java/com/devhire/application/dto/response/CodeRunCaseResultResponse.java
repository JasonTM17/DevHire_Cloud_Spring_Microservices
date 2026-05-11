package com.devhire.application.dto.response;

import java.util.UUID;

public record CodeRunCaseResultResponse(
        UUID caseId,
        String name,
        String visibility,
        boolean passed,
        String verdict,
        String output,
        String stdout,
        String stderr,
        String compileOutput,
        String error,
        long executionTimeMs,
        long memoryKb,
        int timeLimitMs,
        int memoryLimitKb
) {
    public CodeRunCaseResultResponse(UUID caseId,
                                     String name,
                                     String visibility,
                                     boolean passed,
                                     String output,
                                     String error,
                                     long executionTimeMs,
                                     long memoryKb) {
        this(caseId, name, visibility, passed, passed ? "ACCEPTED" : "WRONG_ANSWER", output,
                output, null, null, error, executionTimeMs, memoryKb, 0, 0);
    }
}
