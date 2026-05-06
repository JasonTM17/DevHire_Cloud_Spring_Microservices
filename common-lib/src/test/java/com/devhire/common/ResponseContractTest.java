package com.devhire.common;

import com.devhire.common.error.ErrorResponse;
import com.devhire.common.error.FieldViolation;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ResponseContractTest {
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @Test
    void apiResponseKeepsEnvelopeShapeStable() throws Exception {
        ApiResponse<String> response = ApiResponse.ok("created");

        String json = objectMapper.writeValueAsString(response);

        assertThat(response.success()).isTrue();
        assertThat(response.timestamp()).isNotNull();
        assertThat(json).contains("\"success\":true");
        assertThat(json).contains("\"data\":\"created\"");
        assertThat(json).contains("\"timestamp\":");
    }

    @Test
    void errorResponseKeepsTraceAndValidationShapeStable() throws Exception {
        ErrorResponse response = new ErrorResponse(
                java.time.Instant.parse("2026-05-06T00:00:00Z"),
                400,
                "BAD_REQUEST",
                "Validation failed",
                "/api/jobs",
                "trace-123",
                List.of(new FieldViolation("title", "must not be blank"))
        );

        String json = objectMapper.writeValueAsString(response);
        ErrorResponse restored = objectMapper.readValue(json, ErrorResponse.class);

        assertThat(json).contains("\"traceId\":\"trace-123\"");
        assertThat(json).contains("\"violations\":[{\"field\":\"title\",\"message\":\"must not be blank\"}]");
        assertThat(restored).isEqualTo(response);
    }

    @Test
    void authenticatedUserRecordCarriesGatewayIdentityWithoutSecretFields() {
        UUID userId = UUID.fromString("00000000-0000-0000-0000-000000000123");
        AuthenticatedUser user = new AuthenticatedUser(userId, "candidate@devhire.local", UserRole.CANDIDATE);

        assertThat(user.id()).isEqualTo(userId);
        assertThat(user.email()).isEqualTo("candidate@devhire.local");
        assertThat(user.role()).isEqualTo(UserRole.CANDIDATE);
        assertThat(user.toString()).doesNotContain("token", "password", "secret");
    }
}
