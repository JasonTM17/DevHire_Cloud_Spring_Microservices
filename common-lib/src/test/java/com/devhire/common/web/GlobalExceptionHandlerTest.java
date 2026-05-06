package com.devhire.common.web;

import com.devhire.common.error.ErrorCode;
import com.devhire.common.exception.DevHireException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void devHireExceptionUsesDomainStatusAndTraceId() {
        MDC.put(CorrelationIdFilter.MDC_KEY, "trace-domain");
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/jobs");

        var response = handler.handleDevHireException(
                new DevHireException(ErrorCode.CONFLICT, "Job already exists"),
                request
        );

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(409);
        assertThat(response.getBody().error()).isEqualTo("CONFLICT");
        assertThat(response.getBody().message()).isEqualTo("Job already exists");
        assertThat(response.getBody().path()).isEqualTo("/api/jobs");
        assertThat(response.getBody().traceId()).isEqualTo("trace-domain");
    }

    @Test
    void dataIntegrityViolationMapsToConflictWithoutLeakingSqlDetails() {
        MDC.put(CorrelationIdFilter.MDC_KEY, "trace-integrity");
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/applications");

        var response = handler.handleDataIntegrity(
                new DataIntegrityViolationException("duplicate key value violates unique constraint"),
                request
        );

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("CONFLICT");
        assertThat(response.getBody().message()).isEqualTo("Resource violates a uniqueness or integrity constraint");
        assertThat(response.getBody().message()).doesNotContain("duplicate key");
        assertThat(response.getBody().traceId()).isEqualTo("trace-integrity");
    }

    @Test
    void unexpectedExceptionMapsToStableInternalError() {
        MDC.put(CorrelationIdFilter.MDC_KEY, "trace-unexpected");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/admin/audit-logs");

        var response = handler.handleUnexpected(new RuntimeException("database connection failed"), request);

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("INTERNAL_ERROR");
        assertThat(response.getBody().message()).isEqualTo("Unexpected server error");
        assertThat(response.getBody().message()).doesNotContain("password");
        assertThat(response.getBody().traceId()).isEqualTo("trace-unexpected");
    }
}
