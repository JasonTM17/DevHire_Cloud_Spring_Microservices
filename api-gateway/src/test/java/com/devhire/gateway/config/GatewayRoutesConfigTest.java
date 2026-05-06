package com.devhire.gateway.config;

import com.devhire.common.constants.AppHeaders;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;

import java.net.InetSocketAddress;

import static org.assertj.core.api.Assertions.assertThat;

class GatewayRoutesConfigTest {
    private final GatewayRoutesConfig routesConfig = new GatewayRoutesConfig();

    @Test
    void rateLimitKeyPrefersAuthenticatedUserIdOverRemoteAddress() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("/api/jobs")
                .remoteAddress(new InetSocketAddress("203.0.113.10", 52842))
                .header(AppHeaders.USER_ID, "candidate-123"));

        String key = routesConfig.principalOrRemoteAddressKeyResolver().resolve(exchange).block();

        assertThat(key).isEqualTo("candidate-123");
    }

    @Test
    void rateLimitKeyFallsBackToRemoteAddress() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("/api/jobs")
                .remoteAddress(new InetSocketAddress("203.0.113.10", 52842)));

        String key = routesConfig.principalOrRemoteAddressKeyResolver().resolve(exchange).block();

        assertThat(key).isEqualTo("203.0.113.10");
    }

    @Test
    void rateLimitKeyFallsBackToAnonymousForSyntheticRequests() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/api/jobs"));

        String key = routesConfig.principalOrRemoteAddressKeyResolver().resolve(exchange).block();

        assertThat(key).isEqualTo("anonymous");
    }

    @Test
    void gatewayCorsPropertiesParsesCommaSeparatedOrigins() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("devhire.gateway.cors.allowed-origins",
                        "http://localhost:3001, https://devhire.example.invalid ");
        GatewaySecurityConfig config = new GatewaySecurityConfig();

        GatewaySecurityConfig.GatewayCorsProperties properties = config.gatewayCorsProperties(environment);

        assertThat(properties.allowedOrigins())
                .containsExactly("http://localhost:3001", "https://devhire.example.invalid");
        assertThat(config.corsWebFilter(properties)).isNotNull();
    }
}
