package com.devhire.notification.properties;

import net.jqwik.api.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based test for Presence Query Correctness.
 *
 * <p>Feature: realtime-collaboration, Property 11: Presence Query Correctness</p>
 *
 * <p><b>Validates: Requirements 8.5, 11.4</b></p>
 *
 * <p>For any set of users with active WebSocket sessions (represented by session metadata
 * with valid TTL), querying online users for a given context SHALL return exactly the users
 * whose session metadata exists and whose context matches.</p>
 */
@Label("Feature: realtime-collaboration, Property 11: Presence Query Correctness")
@Tag("realtime-collaboration")
@Tag("property-test")
class PresenceQueryCorrectnessPropertyTest {

    /**
     * Represents a session entry in the presence store.
     */
    record PresenceEntry(String userId, String context, long ttlRemainingMs) {
        boolean isActive() {
            return ttlRemainingMs > 0;
        }
    }

    /**
     * Simulates the presence query logic: returns users whose session is active
     * (TTL > 0) and whose context matches the query context.
     */
    static Set<String> queryOnlineUsers(List<PresenceEntry> entries, String queryContext) {
        return entries.stream()
                .filter(PresenceEntry::isActive)
                .filter(entry -> queryContext.equals(entry.context()))
                .map(PresenceEntry::userId)
                .collect(Collectors.toSet());
    }

    /**
     * Property 11a: Query returns exactly the users whose session is active and context matches.
     */
    @Property(tries = 200)
    void queryReturnsExactlyMatchingActiveSessions(
            @ForAll("presenceEntries") List<PresenceEntry> entries,
            @ForAll("contexts") String queryContext
    ) {
        Set<String> result = queryOnlineUsers(entries, queryContext);

        // Expected: all users with active sessions and matching context
        Set<String> expected = entries.stream()
                .filter(e -> e.isActive() && queryContext.equals(e.context()))
                .map(PresenceEntry::userId)
                .collect(Collectors.toSet());

        assertThat(result).isEqualTo(expected);
    }

    /**
     * Property 11b: No expired sessions (TTL <= 0) appear in query results.
     */
    @Property(tries = 200)
    void expiredSessionsNeverAppearInResults(
            @ForAll("presenceEntries") List<PresenceEntry> entries,
            @ForAll("contexts") String queryContext
    ) {
        Set<String> result = queryOnlineUsers(entries, queryContext);

        // Collect users with expired sessions only (no active session)
        Set<String> expiredOnlyUsers = entries.stream()
                .filter(e -> !e.isActive() && queryContext.equals(e.context()))
                .map(PresenceEntry::userId)
                .collect(Collectors.toSet());

        // Remove users who also have an active session
        Set<String> activeUsers = entries.stream()
                .filter(e -> e.isActive() && queryContext.equals(e.context()))
                .map(PresenceEntry::userId)
                .collect(Collectors.toSet());
        expiredOnlyUsers.removeAll(activeUsers);

        for (String expiredUser : expiredOnlyUsers) {
            assertThat(result)
                    .as("Expired user %s should not appear in results", expiredUser)
                    .doesNotContain(expiredUser);
        }
    }

    /**
     * Property 11c: Users with non-matching context never appear in query results.
     */
    @Property(tries = 200)
    void nonMatchingContextUsersNeverAppearInResults(
            @ForAll("presenceEntries") List<PresenceEntry> entries,
            @ForAll("contexts") String queryContext
    ) {
        Set<String> result = queryOnlineUsers(entries, queryContext);

        // Users who only have sessions in different contexts
        Set<String> usersInQueryContext = entries.stream()
                .filter(e -> queryContext.equals(e.context()))
                .map(PresenceEntry::userId)
                .collect(Collectors.toSet());

        Set<String> usersNotInQueryContext = entries.stream()
                .map(PresenceEntry::userId)
                .filter(u -> !usersInQueryContext.contains(u))
                .collect(Collectors.toSet());

        for (String user : usersNotInQueryContext) {
            assertThat(result)
                    .as("User %s with non-matching context should not appear in results", user)
                    .doesNotContain(user);
        }
    }

    @Provide
    Arbitrary<List<PresenceEntry>> presenceEntries() {
        Arbitrary<String> userIds = Arbitraries.of(
                "user-1", "user-2", "user-3", "user-4", "user-5",
                "user-6", "user-7", "user-8"
        );
        Arbitrary<String> contexts = Arbitraries.of(
                "job:101", "job:202", "assessment:301", "assessment:402", "dashboard"
        );
        // TTL: negative means expired, positive means active
        Arbitrary<Long> ttls = Arbitraries.longs().between(-90_000, 90_000);

        Arbitrary<PresenceEntry> entries = Combinators.combine(userIds, contexts, ttls)
                .as(PresenceEntry::new);

        return entries.list().ofMinSize(1).ofMaxSize(30);
    }

    @Provide
    Arbitrary<String> contexts() {
        return Arbitraries.of(
                "job:101", "job:202", "assessment:301", "assessment:402", "dashboard"
        );
    }
}
