package com.devhire.gateway.error;

import com.devhire.common.constants.AppHeaders;
import com.devhire.common.error.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;

import static org.assertj.core.api.Assertions.assertThat;

class GatewayErrorWriterTest {
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final GatewayErrorWriter writer = new GatewayErrorWriter(objectMapper);

    @Test
    void writesStandardGatewayErrorEnvelopeWithTraceId() throws Exception {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("/api/jobs/private")
                .header(AppHeaders.CORRELATION_ID, "trace-gateway-123"));

        writer.write(exchange, HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, "Missing token").block();

        String body = exchange.getResponse().getBodyAsString().block();
        JsonNode json = objectMapper.readTree(body);

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(exchange.getResponse().getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_JSON);
        assertThat(json.get("status").asInt()).isEqualTo(401);
        assertThat(json.get("error").asText()).isEqualTo("UNAUTHORIZED");
        assertThat(json.get("message").asText()).isEqualTo("Missing token");
        assertThat(json.get("path").asText()).isEqualTo("/api/jobs/private");
        assertThat(json.get("traceId").asText()).isEqualTo("trace-gateway-123");
        assertThat(json.get("violations").isArray()).isTrue();
    }
}
