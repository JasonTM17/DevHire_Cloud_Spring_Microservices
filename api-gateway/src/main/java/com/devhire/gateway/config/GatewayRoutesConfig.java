package com.devhire.gateway.config;

import com.devhire.common.constants.AppHeaders;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.GatewayFilterSpec;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.cloud.gateway.route.builder.UriSpec;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.function.Function;

@Configuration
public class GatewayRoutesConfig {
    private static final String API_REWRITE_REGEX = "/api/(?<segment>.*)";
    private static final String API_REWRITE_REPLACEMENT = "/${segment}";
    private static final String CONTENT_SECURITY_POLICY = "default-src 'self'; frame-ancestors 'none'";
    private static final String PERMISSIONS_POLICY = "camera=(), geolocation=(), microphone=()";

    @Bean
    RedisRateLimiter redisRateLimiter(@Value("${devhire.gateway.rate-limit.replenish-rate:20}") int replenishRate,
                                      @Value("${devhire.gateway.rate-limit.burst-capacity:40}") int burstCapacity) {
        return new RedisRateLimiter(replenishRate, burstCapacity);
    }

    @Bean
    KeyResolver principalOrRemoteAddressKeyResolver() {
        return exchange -> Mono.justOrEmpty(identityOrRemoteAddress(exchange)).defaultIfEmpty("anonymous");
    }

    @Bean
    RouteLocator gatewayRoutes(RouteLocatorBuilder builder,
                               RedisRateLimiter redisRateLimiter,
                               KeyResolver keyResolver,
                               @Value("${devhire.gateway.services.auth}") String authServiceUrl,
                               @Value("${devhire.gateway.services.user}") String userServiceUrl,
                               @Value("${devhire.gateway.services.company}") String companyServiceUrl,
                               @Value("${devhire.gateway.services.job}") String jobServiceUrl,
                               @Value("${devhire.gateway.services.application}") String applicationServiceUrl,
                               @Value("${devhire.gateway.services.notification}") String notificationServiceUrl,
                               @Value("${devhire.gateway.services.audit}") String auditServiceUrl,
                               @Value("${devhire.gateway.services.ai}") String aiServiceUrl) {
        Function<GatewayFilterSpec, UriSpec> filters = filters(redisRateLimiter, keyResolver);
        return builder.routes()
                .route("auth-service", route -> route.path("/api/auth/**").filters(filters).uri(authServiceUrl))
                .route("user-service", route -> route.path("/api/users/**").filters(filters).uri(userServiceUrl))
                .route("application-apply", route -> route.path("/api/jobs/*/applications/**").filters(filters).uri(applicationServiceUrl))
                .route("candidate-skill-analytics", route -> route.path("/api/candidate/skill-analytics").filters(filters).uri(jobServiceUrl))
                .route("candidate-ai-roadmap", route -> route.path("/api/candidate/roadmap", "/api/candidate/interview-prep").filters(filters).uri(aiServiceUrl))
                .route("candidate-application-read-models", route -> route.path("/api/candidate/**").filters(filters).uri(applicationServiceUrl))
                .route("employer-company-service", route -> route.path("/api/employer/companies", "/api/employer/companies/**").filters(filters).uri(companyServiceUrl))
                .route("application-employer", route -> route.path("/api/employer/**").filters(filters).uri(applicationServiceUrl))
                .route("application-service", route -> route.path("/api/applications/**").filters(filters).uri(applicationServiceUrl))
                .route("admin-company-service", route -> route.path("/api/admin/companies/**").filters(filters).uri(companyServiceUrl))
                .route("company-service", route -> route.path("/api/companies/**").filters(filters).uri(companyServiceUrl))
                .route("admin-job-service", route -> route.path("/api/admin/jobs/**").filters(filters).uri(jobServiceUrl))
                .route("job-service", route -> route.path("/api/jobs/**").filters(filters).uri(jobServiceUrl))
                .route("notification-service", route -> route.path("/api/notifications/**").filters(filters).uri(notificationServiceUrl))
                .route("admin-operations-summary", route -> route.path("/api/admin/operations/**").filters(filters).uri(auditServiceUrl))
                .route("audit-service", route -> route.path("/api/admin/audit-logs/**", "/api/admin/audit-logs").filters(filters).uri(auditServiceUrl))
                .route("admin-ai-service", route -> route.path("/api/admin/ai/**").filters(filters).uri(aiServiceUrl))
                .route("ai-service", route -> route.path("/api/ai/**").filters(filters).uri(aiServiceUrl))
                .build();
    }

    private static Function<GatewayFilterSpec, UriSpec> filters(RedisRateLimiter redisRateLimiter, KeyResolver keyResolver) {
        return filter -> filter
                .addResponseHeader("X-Content-Type-Options", "nosniff")
                .addResponseHeader("X-Frame-Options", "DENY")
                .addResponseHeader("Referrer-Policy", "no-referrer")
                .addResponseHeader("Permissions-Policy", PERMISSIONS_POLICY)
                .addResponseHeader("Content-Security-Policy", CONTENT_SECURITY_POLICY)
                .rewritePath(API_REWRITE_REGEX, API_REWRITE_REPLACEMENT)
                .requestRateLimiter(config -> config
                        .setRateLimiter(redisRateLimiter)
                        .setKeyResolver(keyResolver)
                        .setStatusCode(HttpStatus.TOO_MANY_REQUESTS));
    }

    private static String identityOrRemoteAddress(ServerWebExchange exchange) {
        String userId = exchange.getRequest().getHeaders().getFirst(AppHeaders.USER_ID);
        if (userId != null && !userId.isBlank()) {
            return userId;
        }
        if (exchange.getRequest().getRemoteAddress() != null) {
            return exchange.getRequest().getRemoteAddress().getAddress().getHostAddress();
        }
        return null;
    }
}
