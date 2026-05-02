package com.devhire.auth.security;

import com.devhire.auth.config.JwtProperties;
import com.devhire.auth.entity.UserAccount;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class JwtService {
    private static final String BLACKLIST_PREFIX = "auth:blacklist:";

    private final JwtProperties properties;
    private final SecretKey secretKey;
    private final StringRedisTemplate redisTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    public JwtService(JwtProperties properties, StringRedisTemplate redisTemplate) {
        this.properties = properties;
        this.secretKey = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
        this.redisTemplate = redisTemplate;
    }

    public TokenDetails createAccessToken(UserAccount user) {
        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plus(properties.accessTokenTtl());
        String token = Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .signWith(secretKey)
                .compact();
        return new TokenDetails(token, expiresAt);
    }

    public TokenDetails createRefreshToken() {
        byte[] bytes = new byte[64];
        secureRandom.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        return new TokenDetails(token, Instant.now().plus(properties.refreshTokenTtl()));
    }

    public Optional<AuthenticatedUser> authenticateAccessToken(String token) {
        if (isBlacklisted(token)) {
            return Optional.empty();
        }
        try {
            Claims claims = parseClaims(token);
            return Optional.of(new AuthenticatedUser(
                    UUID.fromString(claims.getSubject()),
                    claims.get("email", String.class),
                    UserRole.valueOf(claims.get("role", String.class))
            ));
        } catch (RuntimeException ex) {
            return Optional.empty();
        }
    }

    public Instant accessTokenExpiresAt(String token) {
        return parseClaims(token).getExpiration().toInstant();
    }

    public void blacklistAccessToken(String token) {
        Instant expiresAt = accessTokenExpiresAt(token);
        long seconds = Math.max(1, expiresAt.getEpochSecond() - Instant.now().getEpochSecond());
        redisTemplate.opsForValue().set(BLACKLIST_PREFIX + sha256(token), "revoked", seconds, TimeUnit.SECONDS);
    }

    public boolean isBlacklisted(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + sha256(token)));
    }

    public String hashToken(String token) {
        return sha256(token);
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm is unavailable", ex);
        }
    }

    public record TokenDetails(String token, Instant expiresAt) {
    }
}
