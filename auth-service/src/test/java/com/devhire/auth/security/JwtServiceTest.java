package com.devhire.auth.security;

import com.devhire.auth.config.JwtProperties;
import com.devhire.auth.entity.UserAccount;
import com.devhire.common.security.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JwtServiceTest {
    private static final String TEST_SECRET = "devhire-test-secret-devhire-test-secret-1234567890";

    private final StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
    private final ValueOperations<String, String> valueOperations = mock(ValueOperations.class);

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties(
                TEST_SECRET,
                Duration.ofMinutes(15),
                Duration.ofDays(7)
        );
        jwtService = new JwtService(properties, redisTemplate);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.hasKey(anyString())).thenReturn(false);
    }

    @Test
    void createAccessTokenCanBeAuthenticatedWithExpectedClaims() {
        UUID userId = UUID.randomUUID();
        UserAccount user = new UserAccount("Candidate@Example.com", "hash", UserRole.CANDIDATE);
        ReflectionTestUtils.setField(user, "id", userId);

        JwtService.TokenDetails token = jwtService.createAccessToken(user);

        assertThat(token.token()).isNotBlank();
        assertThat(token.expiresAt()).isAfter(java.time.Instant.now());
        assertThat(jwtService.accessTokenExpiresAt(token.token()))
                .isEqualTo(token.expiresAt().truncatedTo(ChronoUnit.SECONDS));

        Optional<com.devhire.common.security.AuthenticatedUser> authenticated =
                jwtService.authenticateAccessToken(token.token());

        assertThat(authenticated).isPresent();
        assertThat(authenticated.get().id()).isEqualTo(userId);
        assertThat(authenticated.get().email()).isEqualTo("candidate@example.com");
        assertThat(authenticated.get().role()).isEqualTo(UserRole.CANDIDATE);
    }

    @Test
    void blacklistedTokenIsRejectedBeforeParsingClaims() {
        UUID userId = UUID.randomUUID();
        UserAccount user = new UserAccount("employer@example.com", "hash", UserRole.EMPLOYER);
        ReflectionTestUtils.setField(user, "id", userId);
        String token = jwtService.createAccessToken(user).token();
        when(redisTemplate.hasKey(anyString())).thenReturn(true);

        Optional<com.devhire.common.security.AuthenticatedUser> authenticated =
                jwtService.authenticateAccessToken(token);

        assertThat(authenticated).isEmpty();
    }

    @Test
    void blacklistAccessTokenStoresRevocationKeyUntilTokenExpiration() {
        UUID userId = UUID.randomUUID();
        UserAccount user = new UserAccount("admin@example.com", "hash", UserRole.ADMIN);
        ReflectionTestUtils.setField(user, "id", userId);
        String token = jwtService.createAccessToken(user).token();

        jwtService.blacklistAccessToken(token);

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> valueCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Long> ttlCaptor = ArgumentCaptor.forClass(Long.class);
        ArgumentCaptor<TimeUnit> unitCaptor = ArgumentCaptor.forClass(TimeUnit.class);
        verify(valueOperations).set(keyCaptor.capture(), valueCaptor.capture(), ttlCaptor.capture(), unitCaptor.capture());

        assertThat(keyCaptor.getValue()).startsWith("auth:blacklist:");
        assertThat(valueCaptor.getValue()).isEqualTo("revoked");
        assertThat(ttlCaptor.getValue()).isPositive();
        assertThat(unitCaptor.getValue()).isEqualTo(TimeUnit.SECONDS);
    }

    @Test
    void invalidAccessTokenIsRejectedWithoutThrowing() {
        assertThat(jwtService.authenticateAccessToken("not-a-jwt")).isEmpty();
    }

    @Test
    void jwtPropertiesRejectsShortSecret() {
        assertThatThrownBy(() -> new JwtProperties("too-short", null, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("JWT secret must be at least 32 characters");
    }

    @Test
    void jwtPropertiesAppliesDefaultTtls() {
        JwtProperties properties = new JwtProperties(TEST_SECRET, null, null);

        assertThat(properties.accessTokenTtl()).isEqualTo(Duration.ofMinutes(15));
        assertThat(properties.refreshTokenTtl()).isEqualTo(Duration.ofDays(7));
    }
}
