package com.devhire.gateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "devhire.jwt")
public record GatewayJwtProperties(String secret) {
}
