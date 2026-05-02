package com.devhire.auth.service;

import com.devhire.auth.dto.request.LoginRequest;
import com.devhire.auth.dto.request.RegisterRequest;
import com.devhire.auth.entity.RefreshToken;
import com.devhire.auth.entity.UserAccount;
import com.devhire.auth.event.AuditEventPublisher;
import com.devhire.auth.repository.RefreshTokenRepository;
import com.devhire.auth.repository.UserAccountRepository;
import com.devhire.auth.security.JwtService;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {
    private final UserAccountRepository userRepository = mock(UserAccountRepository.class);
    private final RefreshTokenRepository refreshTokenRepository = mock(RefreshTokenRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final JwtService jwtService = mock(JwtService.class);
    private final AuditEventPublisher auditEventPublisher = mock(AuditEventPublisher.class);

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, refreshTokenRepository, passwordEncoder, jwtService, auditEventPublisher);
        when(jwtService.createAccessToken(any())).thenReturn(new JwtService.TokenDetails("access", Instant.now().plusSeconds(900)));
        when(jwtService.createRefreshToken()).thenReturn(new JwtService.TokenDetails("refresh", Instant.now().plusSeconds(86_400)));
        when(jwtService.hashToken("refresh")).thenReturn("refresh-hash");
    }

    @Test
    void registerCreatesCandidateAndRefreshToken() {
        when(userRepository.existsByEmail("candidate@example.com")).thenReturn(false);
        when(passwordEncoder.encode("Candidate@123456")).thenReturn("hash");
        when(userRepository.save(any(UserAccount.class))).thenAnswer(invocation -> {
            UserAccount account = invocation.getArgument(0);
            ReflectionTestUtils.setField(account, "id", UUID.randomUUID());
            return account;
        });

        var response = authService.register(new RegisterRequest(
                "Candidate@Example.com",
                "Candidate@123456",
                UserRole.CANDIDATE
        ));

        assertThat(response.email()).isEqualTo("candidate@example.com");
        assertThat(response.role()).isEqualTo(UserRole.CANDIDATE);
        assertThat(response.accessToken()).isEqualTo("access");
        assertThat(response.refreshToken()).isEqualTo("refresh");
        verify(refreshTokenRepository).save(any(RefreshToken.class));
        verify(auditEventPublisher).publish(any());
    }

    @Test
    void registerRejectsAdminSelfRegistration() {
        assertThatThrownBy(() -> authService.register(new RegisterRequest(
                "admin@example.com",
                "Admin@123456",
                UserRole.ADMIN
        ))).isInstanceOf(DevHireException.class)
                .hasMessageContaining("Admin accounts cannot be self-registered");
    }

    @Test
    void loginRejectsWrongPassword() {
        UserAccount account = new UserAccount("candidate@example.com", "hash", UserRole.CANDIDATE);
        ReflectionTestUtils.setField(account, "id", UUID.randomUUID());
        when(userRepository.findByEmail("candidate@example.com")).thenReturn(Optional.of(account));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("candidate@example.com", "bad-password")))
                .isInstanceOf(DevHireException.class)
                .hasMessageContaining("Invalid email or password");
    }
}

