package com.devhire.gateway.error;

import com.devhire.common.constants.AppHeaders;
import com.devhire.common.error.ErrorCode;
import com.devhire.common.error.ErrorResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

@Component
public class GatewayErrorWriter {
    private final ObjectMapper objectMapper;

    public GatewayErrorWriter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Mono<Void> write(ServerWebExchange exchange, HttpStatus status, ErrorCode code, String message) {
        if (exchange.getResponse().isCommitted()) {
            return Mono.empty();
        }
        String traceId = exchange.getRequest().getHeaders().getFirst(AppHeaders.CORRELATION_ID);
        ErrorResponse error = ErrorResponse.of(status.value(), code.name(), message,
                exchange.getRequest().getPath().value(), traceId);
        byte[] body = serialize(error);
        exchange.getResponse().setStatusCode(status);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        DataBuffer buffer = exchange.getResponse().bufferFactory().wrap(body);
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }

    private byte[] serialize(ErrorResponse error) {
        try {
            return objectMapper.writeValueAsBytes(error);
        } catch (JsonProcessingException ex) {
            return ("{\"status\":500,\"error\":\"INTERNAL_ERROR\",\"message\":\"Unexpected server error\"}")
                    .getBytes(StandardCharsets.UTF_8);
        }
    }
}
