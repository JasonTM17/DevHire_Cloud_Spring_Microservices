package com.devhire.auth.service;

import com.devhire.auth.dto.request.LoginRequest;
import com.devhire.auth.dto.request.LogoutRequest;
import com.devhire.auth.dto.request.RefreshTokenRequest;
import com.devhire.auth.dto.request.RegisterRequest;
import com.devhire.auth.dto.response.AuthResponse;
import com.devhire.auth.dto.response.MeResponse;
import com.devhire.auth.entity.RefreshToken;
import com.devhire.auth.entity.UserAccount;
import com.devhire.auth.event.AuditEventPublisher;
import com.devhire.auth.repository.RefreshTokenRepository;
import com.devhire.auth.repository.UserAccountRepository;
import com.devhire.auth.security.JwtService;
import com.devhire.common.error.ErrorCode;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import org.springframework.http.HttpHeaders;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;

@Service
public class AuthService {
    private final UserAccountRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditEventPublisher auditEventPublisher;

    public AuthService(UserAccountRepository userRepository,
                       RefreshTokenRepository refreshTokenRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       AuditEventPublisher auditEventPublisher) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.auditEventPublisher = auditEventPublisher;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.role() == UserRole.ADMIN) {
            throw new DevHireException(ErrorCode.BAD_REQUEST, "Admin accounts cannot be self-registered");
        }
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw new DevHireException(ErrorCode.CONFLICT, "Email already registered");
        }
        UserAccount user = userRepository.save(new UserAccount(
                email,
                passwordEncoder.encode(request.password()),
                request.role()
        ));
        auditEventPublisher.publish(AuditEvent.now(user.getId(), user.getEmail(), user.getRole().name(),
                "register", "user", user.getId().toString(), Map.of("role", user.getRole().name())));
        return issueTokens(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        UserAccount user = userRepository.findByEmail(normalizeEmail(request.email()))
                .filter(UserAccount::isEnabled)
                .orElseThrow(() -> new DevHireException(ErrorCode.UNAUTHORIZED, "Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new DevHireException(ErrorCode.UNAUTHORIZED, "Invalid email or password");
        }
        auditEventPublisher.publish(AuditEvent.now(user.getId(), user.getEmail(), user.getRole().name(),
                "login", "user", user.getId().toString(), Map.of()));
        return issueTokens(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        String oldTokenHash = jwtService.hashToken(request.refreshToken());
        RefreshToken existing = refreshTokenRepository.findByTokenHash(oldTokenHash)
                .orElseThrow(() -> new DevHireException(ErrorCode.UNAUTHORIZED, "Invalid refresh token"));
        if (!existing.isActive(Instant.now())) {
            throw new DevHireException(ErrorCode.UNAUTHORIZED, "Refresh token is expired or revoked");
        }
        UserAccount user = userRepository.findById(existing.getUserId())
                .filter(UserAccount::isEnabled)
                .orElseThrow(() -> new DevHireException(ErrorCode.UNAUTHORIZED, "User account is disabled"));
        JwtService.TokenDetails accessToken = jwtService.createAccessToken(user);
        JwtService.TokenDetails refreshToken = jwtService.createRefreshToken();
        String newTokenHash = jwtService.hashToken(refreshToken.token());
        existing.revoke(Instant.now(), newTokenHash);
        refreshTokenRepository.save(new RefreshToken(user.getId(), newTokenHash, refreshToken.expiresAt()));
        return toResponse(user, accessToken, refreshToken);
    }

    @Transactional
    public void logout(LogoutRequest request, String authorization) {
        refreshTokenRepository.findByTokenHash(jwtService.hashToken(request.refreshToken()))
                .ifPresent(token -> token.revoke(Instant.now(), null));
        String accessToken = bearerToken(authorization);
        if (accessToken != null) {
            jwtService.blacklistAccessToken(accessToken);
        }
    }

    @Transactional(readOnly = true)
    public MeResponse me(AuthenticatedUser user) {
        if (user == null) {
            throw new DevHireException(ErrorCode.UNAUTHORIZED, "Authentication is required");
        }
        return new MeResponse(user.id(), user.email(), user.role());
    }

    private AuthResponse issueTokens(UserAccount user) {
        JwtService.TokenDetails accessToken = jwtService.createAccessToken(user);
        JwtService.TokenDetails refreshToken = jwtService.createRefreshToken();
        refreshTokenRepository.save(new RefreshToken(
                user.getId(),
                jwtService.hashToken(refreshToken.token()),
                refreshToken.expiresAt()
        ));
        return toResponse(user, accessToken, refreshToken);
    }

    private static AuthResponse toResponse(UserAccount user,
                                           JwtService.TokenDetails accessToken,
                                           JwtService.TokenDetails refreshToken) {
        return new AuthResponse(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                accessToken.token(),
                refreshToken.token(),
                accessToken.expiresAt(),
                refreshToken.expiresAt()
        );
    }

    private static String bearerToken(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        return authorization.substring(7);
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}

