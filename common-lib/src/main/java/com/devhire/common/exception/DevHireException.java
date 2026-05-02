package com.devhire.common.exception;

import com.devhire.common.error.ErrorCode;

public class DevHireException extends RuntimeException {
    private final ErrorCode errorCode;

    public DevHireException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public ErrorCode errorCode() {
        return errorCode;
    }
}

