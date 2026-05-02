package com.devhire.auth.controller;

import com.devhire.auth.dto.request.LoginRequest;
import com.devhire.auth.dto.request.LogoutRequest;
import com.devhire.auth.dto.request.RefreshTokenRequest;
import com.devhire.auth.dto.request.RegisterRequest;
import com.devhire.auth.dto.response.AuthResponse;
import com.devhire.auth.dto.response.MeResponse;
import com.devhire.auth.service.AuthService;
import com.devhire.common.ApiResponse;
import com.devhire.common.security.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.ok(authService.refresh(request));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@Valid @RequestBody LogoutRequest request,
                       @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization) {
        authService.logout(request, authorization);
    }

    @GetMapping("/me")
    public ApiResponse<MeResponse> me(@AuthenticationPrincipal AuthenticatedUser user) {
        return ApiResponse.ok(authService.me(user));
    }
}

