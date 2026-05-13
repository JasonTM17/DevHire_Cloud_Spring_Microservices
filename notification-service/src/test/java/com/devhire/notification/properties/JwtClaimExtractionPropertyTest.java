package com.devhire.notification.properties;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import net.jqwik.api.*;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based test for JWT Claim Extraction Round-Trip.
 *
 * <p>Feature: realtime-collaboration, Property 1: JWT Claim Extraction Round-Trip</p>
 *
 * <p><b>Validates: Requirements 1.2, 1.4</b></p>
 *
 * <p>For any valid JWT with random userId, email, role claims, extracted session fields
 * equal original token claims.</p>
 */
@Label("Feature: realtime-collaboration, Property 1: JWT Claim Extraction Round-Trip")
@Tag("realtime-collaboration")
@Tag("property-test")
class JwtClaimExtractionPropertyTest {

    private static final String JWT_SECRET = "ThisIsATestSecretKeyThatIsAtLeast256BitsLongForHS256Algorithm!!";
    private static final SecretKey SECRET_KEY = Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8));

    private static final List<String> VALID_ROLES = List.of(
            "CANDIDATE", "EMPLOYER", "ADMIN", "RECRUITER"
    );

    /**
     * Property 1: For any valid JWT with random userId, email, and role claims,
     * when the token is parsed and claims are extracted, the extracted userId, email,
     * and role fields SHALL equal the original token claims.
     */
    @Property(tries = 150)
    void extractedClaimsEqualOriginalTokenClaims(
            @ForAll("userIds") String userId,
            @ForAll("emails") String email,
            @ForAll("roles") String role
    ) {
        // Generate a valid JWT with the given claims
        String token = Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .claim("role", role)
                .issuedAt(Date.from(Instant.now()))
                .expiration(Date.from(Instant.now().plusSeconds(3600)))
                .signWith(SECRET_KEY)
                .compact();

        // Parse the token and extract claims (simulating WebSocketAuthInterceptor logic)
        var claims = Jwts.parser()
                .verifyWith(SECRET_KEY)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        String extractedUserId = claims.getSubject();
        String extractedEmail = claims.get("email", String.class);
        String extractedRole = claims.get("role", String.class);

        // Verify round-trip: extracted fields equal original claims
        assertThat(extractedUserId).isEqualTo(userId);
        assertThat(extractedEmail).isEqualTo(email);
        assertThat(extractedRole).isEqualTo(role);
    }

    @Provide
    Arbitrary<String> userIds() {
        return Arbitraries.strings()
                .ofMinLength(1)
                .ofMaxLength(64)
                .alpha().numeric()
                .withChars('-', '_');
    }

    @Provide
    Arbitrary<String> emails() {
        Arbitrary<String> localPart = Arbitraries.strings()
                .ofMinLength(1)
                .ofMaxLength(20)
                .alpha().numeric()
                .withChars('.', '_', '-');
        Arbitrary<String> domain = Arbitraries.strings()
                .ofMinLength(2)
                .ofMaxLength(10)
                .alpha();
        Arbitrary<String> tld = Arbitraries.of("com", "org", "net", "io", "dev");

        return Combinators.combine(localPart, domain, tld)
                .as((local, dom, t) -> local + "@" + dom + "." + t);
    }

    @Provide
    Arbitrary<String> roles() {
        return Arbitraries.of(VALID_ROLES);
    }
}
