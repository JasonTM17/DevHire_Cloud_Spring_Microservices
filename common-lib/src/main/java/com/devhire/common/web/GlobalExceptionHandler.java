package com.devhire.common.web;

import com.devhire.common.error.ErrorCode;
import com.devhire.common.error.ErrorResponse;
import com.devhire.common.error.FieldViolation;
import com.devhire.common.exception.DevHireException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DevHireException.class)
    ResponseEntity<ErrorResponse> handleDevHireException(DevHireException exception, HttpServletRequest request) {
        ErrorCode code = exception.errorCode();
        return ResponseEntity.status(code.status())
                .body(ErrorResponse.of(code.status().value(), code.name(), exception.getMessage(),
                        request.getRequestURI(), traceId()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception,
                                                   HttpServletRequest request) {
        List<FieldViolation> violations = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> new FieldViolation(error.getField(), error.getDefaultMessage()))
                .toList();
        ErrorResponse response = new ErrorResponse(
                Instant.now(),
                HttpStatus.BAD_REQUEST.value(),
                ErrorCode.VALIDATION_ERROR.name(),
                "Request validation failed",
                request.getRequestURI(),
                traceId(),
                violations
        );
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorResponse> handleDataIntegrity(DataIntegrityViolationException exception,
                                                      HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(HttpStatus.CONFLICT.value(), ErrorCode.CONFLICT.name(),
                        "Resource violates a uniqueness or integrity constraint", request.getRequestURI(), traceId()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> handleUnexpected(Exception exception, HttpServletRequest request) {
        log.error("unexpected_request_failure path={} traceId={}", request.getRequestURI(), traceId(), exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorResponse.of(HttpStatus.INTERNAL_SERVER_ERROR.value(), ErrorCode.INTERNAL_ERROR.name(),
                        "Unexpected server error", request.getRequestURI(), traceId()));
    }

    private static String traceId() {
        return MDC.get(CorrelationIdFilter.MDC_KEY);
    }
}
