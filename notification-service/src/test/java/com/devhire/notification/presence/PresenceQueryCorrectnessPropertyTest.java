package com.devhire.notification.presence;

import com.fasterxml.jackson.databind.ObjectMapper;
import net.jqwik.api.*;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Property 11: Presence Query Correctness
 * <p>
 * For any set of users with active WebSocket sessions (represented by Redis session metadata
 * with valid TTL), querying online users for a given context SHALL return exactly the users
 * whose session metadata exists in Redis and whose context matches.
 * <p>
 * <b>Validates: Requirements 8.5, 11.4</b>
 * <p>
 * Feature: realtime-collaboration, Property 11: Presence Query Correctness
 */
@Tag("realtime-collaboration")
@Tag("Property-11-Presence-Query-Correctness")
class PresenceQueryCorrectnessPropertyTest {

    private static final String PRESENCE_KEY_PREFIX = "presence:user:";

    /**
     * Property 11: For any set of sessions with various contexts and TTLs,
     * querying online users for a given context returns exactly the users
     * whose presence key exists in Redis and whose context matches.
     * <p>
     * <b>Validates: Requirements 8.5, 11.4</b>
     */
    @Property(tries = 150)
    void queryReturnsExactlyMatchingActiveSessions(
            @ForAll("presenceScenarios") PresenceScenario scenario
    ) {
        // Setup mocks
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        ObjectMapper objectMapper = new ObjectMapper();

        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        // Build the set of Redis keys that exist (simulating active sessions with valid TTL)
        Set<String> allKeys = new HashSet<>();
        for (UserPresence user : scenario.activeUsers()) {
            String key = PRESENCE_KEY_PREFIX + user.userId();
            allKeys.add(key);
            // Simulate the stored JSON value with context
            String jsonValue = "{\"context\":\"" + user.context() + "\",\"connectedAt\":\"2024-01-01T00:00:00Z\"}";
            when(valueOps.get(key)).thenReturn(jsonValue);
        }

        // Expired users have no keys in Redis (TTL expired)
        // They are simply not in the allKeys set

        when(redisTemplate.keys(PRESENCE_KEY_PREFIX + "*")).thenReturn(allKeys);

        PresenceTracker presenceTracker = new PresenceTracker(redisTemplate, messagingTemplate, objectMapper);

        // Act: query for the target context
        Set<String> result = presenceTracker.getOnlineUsers(scenario.queryContext());

        // Assert: result contains exactly the users whose context matches the query
        Set<String> expected = activeContextByUser(scenario.activeUsers()).entrySet().stream()
                .filter(entry -> scenario.queryContext().equals(entry.getValue()))
                .map(Map.Entry::getKey)
                .collect(Collectors.toSet());

        assertThat(result).isEqualTo(expected);
    }

    /**
     * Property 11 (completeness): No user with a non-matching context appears in results.
     * <p>
     * <b>Validates: Requirements 8.5, 11.4</b>
     */
    @Property(tries = 150)
    void queryExcludesUsersWithDifferentContext(
            @ForAll("presenceScenarios") PresenceScenario scenario
    ) {
        // Setup mocks
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        ObjectMapper objectMapper = new ObjectMapper();

        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        Set<String> allKeys = new HashSet<>();
        for (UserPresence user : scenario.activeUsers()) {
            String key = PRESENCE_KEY_PREFIX + user.userId();
            allKeys.add(key);
            String jsonValue = "{\"context\":\"" + user.context() + "\",\"connectedAt\":\"2024-01-01T00:00:00Z\"}";
            when(valueOps.get(key)).thenReturn(jsonValue);
        }

        when(redisTemplate.keys(PRESENCE_KEY_PREFIX + "*")).thenReturn(allKeys);

        PresenceTracker presenceTracker = new PresenceTracker(redisTemplate, messagingTemplate, objectMapper);

        // Act
        Set<String> result = presenceTracker.getOnlineUsers(scenario.queryContext());

        // Assert: no user with a different context is in the result
        Set<String> usersWithDifferentContext = activeContextByUser(scenario.activeUsers()).entrySet().stream()
                .filter(entry -> !scenario.queryContext().equals(entry.getValue()))
                .map(Map.Entry::getKey)
                .collect(Collectors.toSet());

        for (String userId : usersWithDifferentContext) {
            assertThat(result).doesNotContain(userId);
        }
    }

    /**
     * Property 11 (expired sessions): Users whose TTL has expired (no key in Redis)
     * are not returned by the presence query.
     * <p>
     * <b>Validates: Requirements 8.5, 11.4</b>
     */
    @Property(tries = 150)
    void expiredSessionsNotReturnedInQuery(
            @ForAll("presenceScenariosWithExpired") PresenceScenarioWithExpired scenario
    ) {
        // Setup mocks
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
        ObjectMapper objectMapper = new ObjectMapper();

        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        // Only active users have keys in Redis
        Set<String> allKeys = new HashSet<>();
        for (UserPresence user : scenario.activeUsers()) {
            String key = PRESENCE_KEY_PREFIX + user.userId();
            allKeys.add(key);
            String jsonValue = "{\"context\":\"" + user.context() + "\",\"connectedAt\":\"2024-01-01T00:00:00Z\"}";
            when(valueOps.get(key)).thenReturn(jsonValue);
        }

        // Expired users' keys do NOT exist in Redis (TTL expired)
        when(redisTemplate.keys(PRESENCE_KEY_PREFIX + "*")).thenReturn(allKeys);

        PresenceTracker presenceTracker = new PresenceTracker(redisTemplate, messagingTemplate, objectMapper);

        // Act
        Set<String> result = presenceTracker.getOnlineUsers(scenario.queryContext());

        // Assert: no expired user appears in results
        for (UserPresence expired : scenario.expiredUsers()) {
            assertThat(result).doesNotContain(expired.userId());
        }
    }

    @Provide
    Arbitrary<PresenceScenario> presenceScenarios() {
        Arbitrary<String> contexts = Arbitraries.of("job:101", "job:202", "assessment:303", "dashboard", "job:404");
        Arbitrary<String> userIds = Arbitraries.strings().alpha().ofMinLength(5).ofMaxLength(12)
                .map(s -> "user-" + s);

        Arbitrary<List<UserPresence>> users = Combinators.combine(userIds, contexts)
                .as(UserPresence::new)
                .list().ofMinSize(1).ofMaxSize(15);

        return Combinators.combine(users, contexts)
                .as(PresenceScenario::new);
    }

    @Provide
    Arbitrary<PresenceScenarioWithExpired> presenceScenariosWithExpired() {
        Arbitrary<String> contexts = Arbitraries.of("job:101", "job:202", "assessment:303", "dashboard");
        Arbitrary<String> userIds = Arbitraries.strings().alpha().ofMinLength(5).ofMaxLength(12)
                .map(s -> "user-" + s);

        Arbitrary<List<UserPresence>> activeUsers = Combinators.combine(userIds, contexts)
                .as(UserPresence::new)
                .list().ofMinSize(1).ofMaxSize(10);

        Arbitrary<List<UserPresence>> expiredUsers = Combinators.combine(
                userIds.map(id -> "expired-" + id), contexts
        ).as(UserPresence::new).list().ofMinSize(1).ofMaxSize(5);

        return Combinators.combine(activeUsers, expiredUsers, contexts)
                .as(PresenceScenarioWithExpired::new);
    }

    private Map<String, String> activeContextByUser(List<UserPresence> activeUsers) {
        Map<String, String> contextByUser = new LinkedHashMap<>();
        for (UserPresence user : activeUsers) {
            contextByUser.put(user.userId(), user.context());
        }
        return contextByUser;
    }

    record UserPresence(String userId, String context) {}

    record PresenceScenario(List<UserPresence> activeUsers, String queryContext) {}

    record PresenceScenarioWithExpired(
            List<UserPresence> activeUsers,
            List<UserPresence> expiredUsers,
            String queryContext
    ) {}
}
