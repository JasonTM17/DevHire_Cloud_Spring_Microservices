package com.devhire.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "devhire.jwt")
public record JwtProperties(
        String secret,
        Duration accessTokenTtl,
        Duration refreshTokenTtl
) {
    public JwtProperties {
        if (secret == null || secret.length() < 32) {
            throw new IllegalArgumentException("JWT secret must be at least 32 characters");
        }
        accessTokenTtl = accessTokenTtl == null ? Duration.ofMinutes(15) : accessTokenTtl;
        refreshTokenTtl = refreshTokenTtl == null ? Duration.ofDays(7) : refreshTokenTtl;
    }
}

