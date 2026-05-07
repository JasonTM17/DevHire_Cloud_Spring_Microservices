package com.devhire.gateway.security;

import com.devhire.common.constants.AppHeaders;
import com.devhire.gateway.config.GatewayJwtProperties;
import com.devhire.gateway.error.GatewayErrorWriter;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class JwtAuthenticationGatewayFilterTest {
    private static final String SECRET = "local-dev-only-change-this-secret-with-at-least-32-characters";

    private final ReactiveStringRedisTemplate redisTemplate = mock(ReactiveStringRedisTemplate.class);
    private final JwtAuthenticationGatewayFilter filter = new JwtAuthenticationGatewayFilter(
            new GatewayJwtProperties(SECRET),
            redisTemplate,
            new GatewayErrorWriter(new ObjectMapper().findAndRegisterModules())
    );

    @Test
    void validJwtAddsIdentityHeadersForDownstreamServices() {
        UUID userId = UUID.randomUUID();
        when(redisTemplate.hasKey(anyString())).thenReturn(Mono.just(false));
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("/api/users/me")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token(userId, "candidate@example.com", "CANDIDATE")));
        AtomicReference<ServerWebExchange> downstreamExchange = new AtomicReference<>();
        GatewayFilterChain chain = mutated -> {
            downstreamExchange.set(mutated);
            return Mono.empty();
        };

        filter.filter(exchange, chain).block();

        assertThat(downstreamExchange.get().getRequest().getHeaders().getFirst(AppHeaders.USER_ID))
                .isEqualTo(userId.toString());
        assertThat(downstreamExchange.get().getRequest().getHeaders().getFirst(AppHeaders.USER_EMAIL))
                .isEqualTo("candidate@example.com");
        assertThat(downstreamExchange.get().getRequest().getHeaders().getFirst(AppHeaders.USER_ROLE))
                .isEqualTo("CANDIDATE");
    }

    @Test
    void missingJwtReturnsUnauthorized() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/api/users/me"));
        GatewayFilterChain chain = mutated -> Mono.error(new AssertionError("chain should not be called"));

        filter.filter(exchange, chain).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verifyNoInteractions(redisTemplate);
    }

    @Test
    void publicAuthRouteStripsSpoofedIdentityHeaders() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .post("/api/auth/login")
                .header(AppHeaders.USER_ID, UUID.randomUUID().toString()));
        AtomicReference<ServerWebExchange> downstreamExchange = new AtomicReference<>();
        GatewayFilterChain chain = mutated -> {
            downstreamExchange.set(mutated);
            return Mono.empty();
        };

        filter.filter(exchange, chain).block();

        assertThat(downstreamExchange.get().getRequest().getHeaders()).doesNotContainKey(AppHeaders.USER_ID);
        verifyNoInteractions(redisTemplate);
    }

    @Test
    void publicCompanyReadsDoNotRequireJwtButStripSpoofedIdentityHeaders() {
        for (String path : new String[] {
                "/api/companies",
                "/api/companies/slug/portfolio-labs",
                "/api/companies/11111111-1111-1111-1111-111111111111"
        }) {
            MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                    .get(path)
                    .header(AppHeaders.USER_ID, UUID.randomUUID().toString())
                    .header(AppHeaders.USER_ROLE, "ADMIN"));
            AtomicReference<ServerWebExchange> downstreamExchange = new AtomicReference<>();
            GatewayFilterChain chain = mutated -> {
                downstreamExchange.set(mutated);
                return Mono.empty();
            };

            filter.filter(exchange, chain).block();

            assertThat(downstreamExchange.get().getRequest().getHeaders()).doesNotContainKey(AppHeaders.USER_ID);
            assertThat(downstreamExchange.get().getRequest().getHeaders()).doesNotContainKey(AppHeaders.USER_ROLE);
        }
        verifyNoInteractions(redisTemplate);
    }

    @Test
    void companyStatusQueryRequiresJwtForAdminFiltering() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("/api/companies?status=PENDING"));
        GatewayFilterChain chain = mutated -> Mono.error(new AssertionError("chain should not be called"));

        filter.filter(exchange, chain).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verifyNoInteractions(redisTemplate);
    }

    private static String token(UUID userId, String email, String role) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(900)))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }
}
