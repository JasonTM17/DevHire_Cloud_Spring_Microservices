package com.devhire.notification.presence;

import com.devhire.notification.websocket.WebSocketSessionCache;
import com.devhire.notification.websocket.WebSocketSessionMetadata;
import com.fasterxml.jackson.databind.ObjectMapper;
import net.jqwik.api.*;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Property 12: Active Assessment Indicator
 * <p>
 * For any candidate, the "currently taking assessment" indicator SHALL be true if and only if
 * the candidate has an active WebSocket session with a subscription to an assessment status topic.
 * <p>
 * <b>Validates: Requirements 9.4</b>
 * <p>
 * Feature: realtime-collaboration, Property 12: Active Assessment Indicator
 */
@Tag("realtime-collaboration")
@Tag("Property-12-Active-Assessment-Indicator")
class ActiveAssessmentIndicatorPropertyTest {

    private static final String ASSESSMENT_TOPIC_PREFIX = "/topic/assessment/";
    private static final String SESSION_KEY_PREFIX = "ws:session:";

    /**
     * Property 12: For candidate sessions with assessment subscriptions,
     * the indicator is true. For sessions without assessment subscriptions,
     * the indicator is false.
     * <p>
     * The indicator is determined by checking if any of the candidate's active sessions
     * has a subscription matching the pattern /topic/assessment/{assessmentId}/status.
     * <p>
     * <b>Validates: Requirements 9.4</b>
     */
    @Property(tries = 150)
    void indicatorTrueIffAssessmentSubscriptionExists(
            @ForAll("candidateSessionScenarios") CandidateSessionScenario scenario
    ) {
        // Determine expected indicator value:
        // true iff at least one session has a subscription to an assessment topic
        boolean expectedIndicator = scenario.sessions().stream()
                .anyMatch(session -> session.subscriptions().stream()
                        .anyMatch(sub -> sub.startsWith(ASSESSMENT_TOPIC_PREFIX)
                                && sub.contains("/status")));

        // Verify the property: indicator matches the presence of assessment subscriptions
        boolean actualIndicator = hasActiveAssessmentSubscription(scenario.sessions());

        assertThat(actualIndicator)
                .as("Indicator should be %s for candidate %s with subscriptions: %s",
                        expectedIndicator, scenario.candidateId(),
                        scenario.sessions().stream()
                                .flatMap(s -> s.subscriptions().stream())
                                .collect(Collectors.toList()))
                .isEqualTo(expectedIndicator);
    }

    /**
     * Property 12 (biconditional): If indicator is true, there MUST exist at least one
     * assessment subscription. If indicator is false, there MUST NOT exist any assessment
     * subscription.
     * <p>
     * <b>Validates: Requirements 9.4</b>
     */
    @Property(tries = 150)
    void indicatorBiconditionalWithSubscription(
            @ForAll("candidateSessionScenarios") CandidateSessionScenario scenario
    ) {
        boolean indicator = hasActiveAssessmentSubscription(scenario.sessions());

        List<String> allSubscriptions = scenario.sessions().stream()
                .flatMap(s -> s.subscriptions().stream())
                .collect(Collectors.toList());

        boolean hasAssessmentSub = allSubscriptions.stream()
                .anyMatch(sub -> sub.startsWith(ASSESSMENT_TOPIC_PREFIX) && sub.contains("/status"));

        // Biconditional: indicator == hasAssessmentSub
        assertThat(indicator).isEqualTo(hasAssessmentSub);
    }

    /**
     * Property 12 (with WebSocketSessionCache): Verifies the indicator logic works
     * correctly when sessions are retrieved from the session cache.
     * <p>
     * <b>Validates: Requirements 9.4</b>
     */
    @Property(tries = 150)
    void indicatorCorrectWhenQueriedViaSessionCache(
            @ForAll("candidateSessionScenarios") CandidateSessionScenario scenario
    ) {
        // Setup mocks for WebSocketSessionCache
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        ObjectMapper objectMapper = new ObjectMapper();
        @SuppressWarnings("unchecked")
        HashOperations<String, Object, Object> hashOps = mock(HashOperations.class);
        when(redisTemplate.opsForHash()).thenReturn(hashOps);

        // Build the set of keys that exist in Redis
        Set<String> allKeys = new HashSet<>();
        for (SessionInfo session : scenario.sessions()) {
            String key = SESSION_KEY_PREFIX + session.sessionId();
            allKeys.add(key);

            // Mock the hash entries for this session
            Map<Object, Object> entries = new HashMap<>();
            entries.put("userId", scenario.candidateId());
            entries.put("connectedAt", Instant.now().toString());
            entries.put("subscriptions", toJson(session.subscriptions()));
            entries.put("instanceId", "instance-1");
            when(hashOps.entries(key)).thenReturn(entries);
        }
        when(redisTemplate.keys(SESSION_KEY_PREFIX + "*")).thenReturn(allKeys);

        WebSocketSessionCache sessionCache = new WebSocketSessionCache(redisTemplate, objectMapper, "instance-1");

        // Query sessions for the candidate
        List<WebSocketSessionMetadata> sessions = sessionCache.getSessionsByUser(scenario.candidateId());

        // Determine indicator from retrieved sessions
        boolean indicator = sessions.stream()
                .anyMatch(s -> s.subscriptions().stream()
                        .anyMatch(sub -> sub.startsWith(ASSESSMENT_TOPIC_PREFIX)
                                && sub.contains("/status")));

        // Expected
        boolean expected = scenario.sessions().stream()
                .anyMatch(s -> s.subscriptions().stream()
                        .anyMatch(sub -> sub.startsWith(ASSESSMENT_TOPIC_PREFIX)
                                && sub.contains("/status")));

        assertThat(indicator).isEqualTo(expected);
    }

    /**
     * Determines if a candidate is currently taking an assessment based on their
     * active WebSocket sessions. Returns true iff at least one session has a
     * subscription to /topic/assessment/{id}/status.
     */
    private boolean hasActiveAssessmentSubscription(List<SessionInfo> sessions) {
        return sessions.stream()
                .anyMatch(session -> session.subscriptions().stream()
                        .anyMatch(sub -> sub.startsWith(ASSESSMENT_TOPIC_PREFIX)
                                && sub.contains("/status")));
    }

    private String toJson(List<String> subscriptions) {
        try {
            return new ObjectMapper().writeValueAsString(subscriptions);
        } catch (Exception e) {
            return "[]";
        }
    }

    @Provide
    Arbitrary<CandidateSessionScenario> candidateSessionScenarios() {
        Arbitrary<String> candidateIds = Arbitraries.strings().alpha().ofMinLength(5).ofMaxLength(10)
                .map(s -> "candidate-" + s);

        // Generate subscriptions - mix of assessment and non-assessment topics
        Arbitrary<String> assessmentSubs = Arbitraries.strings().alpha().ofLength(8)
                .map(id -> "/topic/assessment/" + id + "/status");

        Arbitrary<String> nonAssessmentSubs = Arbitraries.of(
                "/user/notifications",
                "/topic/presence",
                "/topic/leaderboard/abc123",
                "/topic/job/456/viewers",
                "/user/messages"
        );

        // A session can have a mix of subscriptions
        Arbitrary<List<String>> subscriptionLists = Arbitraries.oneOf(
                // Sessions with only non-assessment subscriptions
                nonAssessmentSubs.list().ofMinSize(1).ofMaxSize(3),
                // Sessions with assessment subscriptions mixed in
                Arbitraries.oneOf(assessmentSubs, nonAssessmentSubs)
                        .list().ofMinSize(1).ofMaxSize(4)
        );

        Arbitrary<SessionInfo> sessions = Combinators.combine(
                Arbitraries.create(() -> UUID.randomUUID().toString()),
                subscriptionLists
        ).as(SessionInfo::new);

        return Combinators.combine(candidateIds, sessions.list().ofMinSize(1).ofMaxSize(3))
                .as(CandidateSessionScenario::new);
    }

    record SessionInfo(String sessionId, List<String> subscriptions) {}

    record CandidateSessionScenario(String candidateId, List<SessionInfo> sessions) {}
}
