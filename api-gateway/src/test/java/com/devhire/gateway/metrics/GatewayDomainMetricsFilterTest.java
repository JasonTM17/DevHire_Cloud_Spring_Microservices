package com.devhire.gateway.metrics;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import reactor.core.publisher.Mono;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GatewayDomainMetricsFilterTest {
    private final SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
    private final GatewayDomainMetricsFilter filter = new GatewayDomainMetricsFilter(meterRegistry);

    @Test
    void recordsGatewayRequestsByRouteAndStatus() {
        MockServerWebExchange exchange = exchangeWithRoute("job-service");
        GatewayFilterChain chain = downstream -> {
            downstream.getResponse().setStatusCode(HttpStatus.OK);
            return Mono.empty();
        };

        filter.filter(exchange, chain).block();

        assertThat(meterRegistry.get("devhire_gateway_requests_total")
                .tag("route", "job-service")
                .tag("status", "200")
                .counter()
                .count()).isEqualTo(1);
        assertThat(meterRegistry.get("devhire_gateway_request_latency_seconds")
                .tag("route", "job-service")
                .tag("status", "200")
                .timer()
                .count()).isEqualTo(1);
    }

    @Test
    void recordsRateLimitedRequestsSeparately() {
        MockServerWebExchange exchange = exchangeWithRoute("auth-service");
        GatewayFilterChain chain = downstream -> {
            downstream.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
            return Mono.empty();
        };

        filter.filter(exchange, chain).block();

        assertThat(meterRegistry.get("devhire_gateway_requests_total")
                .tag("route", "auth-service")
                .tag("status", "429")
                .counter()
                .count()).isEqualTo(1);
        assertThat(meterRegistry.get("devhire_gateway_rate_limited_total")
                .tag("route", "auth-service")
                .counter()
                .count()).isEqualTo(1);
    }

    @Test
    void recordsDownstreamErrorsOnce() {
        MockServerWebExchange exchange = exchangeWithRoute("application-service");
        GatewayFilterChain chain = downstream -> Mono.error(new IllegalStateException("downstream failed"));

        assertThatThrownBy(() -> filter.filter(exchange, chain).block())
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("downstream failed");

        assertThat(meterRegistry.get("devhire_gateway_requests_total")
                .tag("route", "application-service")
                .tag("status", "ERROR")
                .counter()
                .count()).isEqualTo(1);
        assertThat(meterRegistry.find("devhire_gateway_requests_total")
                .tag("route", "application-service")
                .tag("status", "UNKNOWN")
                .counter()).isNull();
    }

    private static MockServerWebExchange exchangeWithRoute(String routeId) {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/api/jobs"));
        exchange.getAttributes().put(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR,
                Route.async()
                        .id(routeId)
                        .uri("http://localhost")
                        .predicate(serverWebExchange -> true)
                        .build());
        return exchange;
    }
}
