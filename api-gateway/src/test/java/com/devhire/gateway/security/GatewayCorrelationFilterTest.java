package com.devhire.gateway.security;

import com.devhire.common.constants.AppHeaders;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.core.Ordered;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class GatewayCorrelationFilterTest {
    private final GatewayCorrelationFilter filter = new GatewayCorrelationFilter();

    @Test
    void preservesIncomingCorrelationIdAcrossRequestAndResponse() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("/api/jobs")
                .header(AppHeaders.CORRELATION_ID, "trace-reviewer-123"));
        AtomicReference<ServerWebExchange> downstream = new AtomicReference<>();
        GatewayFilterChain chain = mutated -> {
            downstream.set(mutated);
            return Mono.empty();
        };

        filter.filter(exchange, chain).block();

        assertThat(downstream.get().getRequest().getHeaders().getFirst(AppHeaders.CORRELATION_ID))
                .isEqualTo("trace-reviewer-123");
        assertThat(downstream.get().getResponse().getHeaders().getFirst(AppHeaders.CORRELATION_ID))
                .isEqualTo("trace-reviewer-123");
    }

    @Test
    void generatesCorrelationIdWhenRequesterDoesNotProvideOne() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/api/jobs"));
        AtomicReference<ServerWebExchange> downstream = new AtomicReference<>();

        filter.filter(exchange, mutated -> {
            downstream.set(mutated);
            return Mono.empty();
        }).block();

        String generated = downstream.get().getRequest().getHeaders().getFirst(AppHeaders.CORRELATION_ID);
        assertThat(generated).isNotBlank();
        assertThat(UUID.fromString(generated)).isNotNull();
        assertThat(downstream.get().getResponse().getHeaders().getFirst(AppHeaders.CORRELATION_ID))
                .isEqualTo(generated);
    }

    @Test
    void runsBeforeOtherGatewayFilters() {
        assertThat(filter.getOrder()).isEqualTo(Ordered.HIGHEST_PRECEDENCE);
    }
}
