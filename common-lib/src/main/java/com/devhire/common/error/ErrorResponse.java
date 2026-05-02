package com.devhire.common.error;

import java.time.Instant;
import java.util.List;

public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        String traceId,
        List<FieldViolation> violations
) {
    public static ErrorResponse of(int status, String error, String message, String path, String traceId) {
        return new ErrorResponse(Instant.now(), status, error, message, path, traceId, List.of());
    }
}

