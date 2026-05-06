package com.devhire.gateway.metrics;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
public class GatewayDomainMetricsFilter implements GlobalFilter, Ordered {
    private static final String REQUESTS_METRIC = "devhire_gateway_requests_total";
    private static final String LATENCY_METRIC = "devhire_gateway_request_latency_seconds";
    private static final String RATE_LIMITED_METRIC = "devhire_gateway_rate_limited_total";

    private final MeterRegistry meterRegistry;

    public GatewayDomainMetricsFilter(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        long startedAt = System.nanoTime();
        AtomicBoolean recorded = new AtomicBoolean(false);
        return chain.filter(exchange)
                .doOnError(error -> recordOnce(exchange, startedAt, "ERROR", recorded))
                .doFinally(signalType -> {
                    HttpStatusCode statusCode = exchange.getResponse().getStatusCode();
                    String status = statusCode == null ? "UNKNOWN" : String.valueOf(statusCode.value());
                    recordOnce(exchange, startedAt, status, recorded);
                });
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }

    private void recordOnce(ServerWebExchange exchange, long startedAt, String status, AtomicBoolean recorded) {
        if (!recorded.compareAndSet(false, true)) {
            return;
        }

        String routeId = routeId(exchange);
        meterRegistry.counter(REQUESTS_METRIC, "route", routeId, "status", status).increment();
        Timer.builder(LATENCY_METRIC)
                .description("Gateway request latency by route and status.")
                .tag("route", routeId)
                .tag("status", status)
                .register(meterRegistry)
                .record(Duration.ofNanos(System.nanoTime() - startedAt));

        if ("429".equals(status)) {
            meterRegistry.counter(RATE_LIMITED_METRIC, "route", routeId).increment();
        }
    }

    private static String routeId(ServerWebExchange exchange) {
        Route route = exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR);
        if (route == null || route.getId() == null || route.getId().isBlank()) {
            return "unmatched";
        }
        return route.getId();
    }
}
