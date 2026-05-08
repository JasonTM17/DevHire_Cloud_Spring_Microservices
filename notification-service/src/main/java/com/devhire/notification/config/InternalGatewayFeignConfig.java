package com.devhire.notification.config;

import com.devhire.common.constants.AppHeaders;
import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class InternalGatewayFeignConfig {
    @Bean
    RequestInterceptor internalGatewayTokenRequestInterceptor(
            @Value("${devhire.gateway.internal-token:}") String internalGatewayToken) {
        String token = internalGatewayToken == null ? "" : internalGatewayToken.trim();
        return template -> {
            if (!token.isBlank()) {
                template.header(AppHeaders.INTERNAL_GATEWAY_TOKEN, token);
            }
        };
    }
}
