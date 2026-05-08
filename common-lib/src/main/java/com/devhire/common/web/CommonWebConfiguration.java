package com.devhire.common.web;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

@Configuration
public class CommonWebConfiguration {
    @Bean
    FilterRegistrationBean<CorrelationIdFilter> correlationIdFilterRegistration() {
        FilterRegistrationBean<CorrelationIdFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new CorrelationIdFilter());
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }

    @Bean
    FilterRegistrationBean<GatewayInternalTokenFilter> gatewayInternalTokenFilterRegistration(
            @Value("${devhire.gateway.internal-token:}") String internalGatewayToken) {
        FilterRegistrationBean<GatewayInternalTokenFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new GatewayInternalTokenFilter(internalGatewayToken));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 1);
        return registration;
    }
}
