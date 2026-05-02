package com.devhire.common;

import java.time.Instant;

public record ApiResponse<T>(
        Instant timestamp,
        boolean success,
        T data
) {
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(Instant.now(), true, data);
    }
}

