package com.devhire.gateway.security;

import com.devhire.common.constants.AppHeaders;
import com.devhire.common.error.ErrorCode;
import com.devhire.gateway.config.GatewayJwtProperties;
import com.devhire.gateway.error.GatewayErrorWriter;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Set;

@Component
public class JwtAuthenticationGatewayFilter implements GlobalFilter, Ordered {
    private static final String BLACKLIST_PREFIX = "auth:blacklist:";
    private static final Set<String> PUBLIC_AUTH_PATHS = Set.of(
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/refresh"
    );

    private final SecretKey secretKey;
    private final ReactiveStringRedisTemplate redisTemplate;
    private final GatewayErrorWriter errorWriter;

    public JwtAuthenticationGatewayFilter(GatewayJwtProperties properties,
                                          ReactiveStringRedisTemplate redisTemplate,
                                          GatewayErrorWriter errorWriter) {
        this.secretKey = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
        this.redisTemplate = redisTemplate;
        this.errorWriter = errorWriter;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().value();
        HttpMethod method = exchange.getRequest().getMethod();
        if (isPublic(method, path)) {
            return chain.filter(stripIdentityHeaders(exchange));
        }
        String token = bearerToken(exchange);
        if (token == null) {
            return unauthorized(exchange, "Missing bearer token");
        }
        Claims claims;
        try {
            claims = parseClaims(token);
        } catch (RuntimeException ex) {
            return unauthorized(exchange, "Invalid or expired bearer token");
        }
        return redisTemplate.hasKey(BLACKLIST_PREFIX + sha256(token))
                .flatMap(blacklisted -> Boolean.TRUE.equals(blacklisted)
                        ? unauthorized(exchange, "Token has been revoked")
                        : chain.filter(withIdentityHeaders(exchange, claims)));
    }

    private ServerWebExchange withIdentityHeaders(ServerWebExchange exchange, Claims claims) {
        return exchange.mutate()
                .request(builder -> builder.headers(headers -> {
                    headers.remove(AppHeaders.USER_ID);
                    headers.remove(AppHeaders.USER_EMAIL);
                    headers.remove(AppHeaders.USER_ROLE);
                    headers.set(AppHeaders.USER_ID, claims.getSubject());
                    headers.set(AppHeaders.USER_EMAIL, claims.get("email", String.class));
                    headers.set(AppHeaders.USER_ROLE, claims.get("role", String.class));
                }))
                .build();
    }

    private ServerWebExchange stripIdentityHeaders(ServerWebExchange exchange) {
        return exchange.mutate()
                .request(builder -> builder.headers(headers -> {
                    headers.remove(AppHeaders.USER_ID);
                    headers.remove(AppHeaders.USER_EMAIL);
                    headers.remove(AppHeaders.USER_ROLE);
                }))
                .build();
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private static boolean isPublic(HttpMethod method, String path) {
        if (method == HttpMethod.OPTIONS) {
            return true;
        }
        return PUBLIC_AUTH_PATHS.contains(path)
                || path.startsWith("/actuator")
                || path.startsWith("/swagger-ui")
                || path.startsWith("/v3/api-docs")
                || isPublicJobRead(method, path);
    }

    private static boolean isPublicJobRead(HttpMethod method, String path) {
        if (method != HttpMethod.GET) {
            return false;
        }
        return path.equals("/api/jobs")
                || path.matches("^/api/jobs/[^/]+$");
    }

    private static String bearerToken(ServerWebExchange exchange) {
        String header = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith("Bearer ")) {
            return null;
        }
        return header.substring(7);
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String message) {
        return errorWriter.write(exchange, HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, message);
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm is unavailable", ex);
        }
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}
