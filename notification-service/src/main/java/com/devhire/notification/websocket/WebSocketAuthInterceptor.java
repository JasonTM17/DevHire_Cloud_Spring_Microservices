package com.devhire.notification.websocket;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

/**
 * Intercepts STOMP CONNECT frames to validate JWT tokens and extract user claims.
 * Rejects connections with invalid or expired tokens by throwing a MessageDeliveryException
 * which causes the WebSocket connection to be closed.
 */
@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(WebSocketAuthInterceptor.class);
    private static final String BLACKLIST_PREFIX = "auth:blacklist:";

    static final String SESSION_ATTR_USER_ID = "userId";
    static final String SESSION_ATTR_EMAIL = "email";
    static final String SESSION_ATTR_ROLE = "role";

    private final SecretKey secretKey;
    private final StringRedisTemplate redisTemplate;

    public WebSocketAuthInterceptor(
            @Value("${devhire.jwt.secret}") String jwtSecret,
            StringRedisTemplate redisTemplate) {
        this.secretKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
        this.redisTemplate = redisTemplate;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() != StompCommand.CONNECT) {
            return message;
        }

        String token = extractToken(accessor);
        if (token == null) {
            log.warn("WebSocket CONNECT rejected: missing or invalid Authorization header");
            throw new org.springframework.messaging.MessageDeliveryException(
                    message, "401: Missing or invalid bearer token");
        }

        if (isBlacklisted(token)) {
            log.warn("WebSocket CONNECT rejected: token has been revoked");
            throw new org.springframework.messaging.MessageDeliveryException(
                    message, "401: Token has been revoked");
        }

        Claims claims;
        try {
            claims = parseClaims(token);
        } catch (RuntimeException ex) {
            log.warn("WebSocket CONNECT rejected: invalid or expired JWT - {}", ex.getMessage());
            throw new org.springframework.messaging.MessageDeliveryException(
                    message, "401: Invalid or expired token");
        }

        String userId = claims.getSubject();
        String email = claims.get("email", String.class);
        String role = claims.get("role", String.class);

        if (userId == null || email == null || role == null) {
            log.warn("WebSocket CONNECT rejected: JWT missing required claims");
            throw new org.springframework.messaging.MessageDeliveryException(
                    message, "401: Token missing required claims");
        }

        // Attach extracted claims to session attributes for downstream use
        accessor.getSessionAttributes().put(SESSION_ATTR_USER_ID, userId);
        accessor.getSessionAttributes().put(SESSION_ATTR_EMAIL, email);
        accessor.getSessionAttributes().put(SESSION_ATTR_ROLE, role);

        log.debug("WebSocket CONNECT authenticated: userId={}, email={}, role={}", userId, email, role);
        return message;
    }

    /**
     * Extracts the bearer token from STOMP CONNECT headers.
     * Checks the "Authorization" native header for a "Bearer " prefixed token.
     */
    private String extractToken(StompHeaderAccessor accessor) {
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders == null || authHeaders.isEmpty()) {
            return null;
        }
        String header = authHeaders.get(0);
        if (header == null || !header.startsWith("Bearer ")) {
            return null;
        }
        return header.substring(7).trim();
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private boolean isBlacklisted(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + sha256(token)));
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm is unavailable", ex);
        }
    }
}
