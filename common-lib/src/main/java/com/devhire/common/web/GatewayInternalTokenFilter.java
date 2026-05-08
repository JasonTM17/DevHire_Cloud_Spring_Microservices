package com.devhire.common.web;

import com.devhire.common.constants.AppHeaders;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class GatewayInternalTokenFilter extends OncePerRequestFilter {
    private final String expectedToken;

    public GatewayInternalTokenFilter(String expectedToken) {
        this.expectedToken = expectedToken == null ? "" : expectedToken.trim();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/actuator");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        boolean internalRoute = path.startsWith("/internal/");
        boolean identityBearingRequest = request.getHeader(AppHeaders.USER_ID) != null
                || request.getHeader(AppHeaders.USER_EMAIL) != null
                || request.getHeader(AppHeaders.USER_ROLE) != null;
        if (!internalRoute && !identityBearingRequest) {
            filterChain.doFilter(request, response);
            return;
        }
        if (expectedToken.isBlank()) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Gateway boundary token is not configured");
            return;
        }
        String actualToken = request.getHeader(AppHeaders.INTERNAL_GATEWAY_TOKEN);
        if (!expectedToken.equals(actualToken)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Gateway boundary token is required");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
