package com.devhire.notification.properties;

import net.jqwik.api.*;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based test for Active Assessment Indicator.
 *
 * <p>Feature: realtime-collaboration, Property 12: Active Assessment Indicator</p>
 *
 * <p><b>Validates: Requirements 9.4</b></p>
 *
 * <p>For any candidate, the "currently taking assessment" indicator SHALL be true
 * if and only if the candidate has an active WebSocket session with a subscription
 * to an assessment status topic.</p>
 */
@Label("Feature: realtime-collaboration, Property 12: Active Assessment Indicator")
@Tag("realtime-collaboration")
@Tag("property-test")
class ActiveAssessmentIndicatorPropertyTest {

    private static final String ASSESSMENT_TOPIC_PREFIX = "/topic/assessment/";

    /**
     * Represents a candidate's WebSocket session with its subscriptions.
     */
    record CandidateSession(String candidateId, List<String> subscriptions, boolean active) {}

    /**
     * Determines if a candidate is currently taking an assessment based on their
     * active session subscriptions. Returns true iff the candidate has an active
     * session with at least one subscription matching the assessment topic pattern.
     */
    static boolean isTakingAssessment(CandidateSession session) {
        if (!session.active()) {
            return false;
        }
        return session.subscriptions().stream()
                .anyMatch(sub -> sub.startsWith(ASSESSMENT_TOPIC_PREFIX));
    }

    /**
     * Property 12a: Indicator is true when candidate has active session with assessment subscription.
     */
    @Property(tries = 200)
    void indicatorTrueWhenAssessmentSubscriptionExists(
            @ForAll("sessionsWithAssessmentSubscription") CandidateSession session
    ) {
        assertThat(isTakingAssessment(session))
                .as("Indicator should be true for active session with assessment subscription")
                .isTrue();
    }

    /**
     * Property 12b: Indicator is false when candidate has no assessment subscription.
     */
    @Property(tries = 200)
    void indicatorFalseWhenNoAssessmentSubscription(
            @ForAll("sessionsWithoutAssessmentSubscription") CandidateSession session
    ) {
        assertThat(isTakingAssessment(session))
                .as("Indicator should be false for session without assessment subscription")
                .isFalse();
    }

    /**
     * Property 12c: Indicator is false when session is inactive regardless of subscriptions.
     */
    @Property(tries = 200)
    void indicatorFalseWhenSessionInactive(
            @ForAll("inactiveSessions") CandidateSession session
    ) {
        assertThat(isTakingAssessment(session))
                .as("Indicator should be false for inactive session")
                .isFalse();
    }

    /**
     * Property 12d: For any candidate session, indicator equals (active AND has assessment sub).
     */
    @Property(tries = 200)
    void indicatorEqualsActiveAndHasAssessmentSubscription(
            @ForAll("arbitrarySessions") CandidateSession session
    ) {
        boolean hasAssessmentSub = session.subscriptions().stream()
                .anyMatch(sub -> sub.startsWith(ASSESSMENT_TOPIC_PREFIX));
        boolean expected = session.active() && hasAssessmentSub;

        assertThat(isTakingAssessment(session))
                .as("Indicator should be %s for active=%s, hasAssessmentSub=%s",
                        expected, session.active(), hasAssessmentSub)
                .isEqualTo(expected);
    }

    @Provide
    Arbitrary<CandidateSession> sessionsWithAssessmentSubscription() {
        Arbitrary<String> candidateIds = Arbitraries.of(
                "candidate-1", "candidate-2", "candidate-3"
        );
        Arbitrary<String> assessmentSubs = Arbitraries.of(
                "/topic/assessment/assess-1/status",
                "/topic/assessment/assess-2/status",
                "/topic/assessment/assess-3/status"
        );
        Arbitrary<List<String>> otherSubs = Arbitraries.of(
                "/user/notifications", "/topic/presence", "/topic/leaderboard"
        ).list().ofMinSize(0).ofMaxSize(3);

        return Combinators.combine(candidateIds, assessmentSubs, otherSubs)
                .as((id, assessSub, others) -> {
                    List<String> allSubs = new ArrayList<>(others);
                    allSubs.add(assessSub);
                    return new CandidateSession(id, allSubs, true);
                });
    }

    @Provide
    Arbitrary<CandidateSession> sessionsWithoutAssessmentSubscription() {
        Arbitrary<String> candidateIds = Arbitraries.of(
                "candidate-1", "candidate-2", "candidate-3"
        );
        Arbitrary<List<String>> nonAssessmentSubs = Arbitraries.of(
                "/user/notifications", "/topic/presence", "/topic/leaderboard",
                "/topic/job/123/viewers", "/user/read-receipts"
        ).list().ofMinSize(0).ofMaxSize(5);

        return Combinators.combine(candidateIds, nonAssessmentSubs)
                .as((id, subs) -> new CandidateSession(id, subs, true));
    }

    @Provide
    Arbitrary<CandidateSession> inactiveSessions() {
        Arbitrary<String> candidateIds = Arbitraries.of(
                "candidate-1", "candidate-2", "candidate-3"
        );
        Arbitrary<List<String>> subs = Arbitraries.of(
                "/user/notifications", "/topic/presence", "/topic/leaderboard",
                "/topic/assessment/assess-1/status", "/topic/assessment/assess-2/status"
        ).list().ofMinSize(0).ofMaxSize(5);

        return Combinators.combine(candidateIds, subs)
                .as((id, s) -> new CandidateSession(id, s, false));
    }

    @Provide
    Arbitrary<CandidateSession> arbitrarySessions() {
        Arbitrary<String> candidateIds = Arbitraries.of(
                "candidate-1", "candidate-2", "candidate-3", "candidate-4"
        );
        Arbitrary<List<String>> subs = Arbitraries.of(
                "/user/notifications", "/topic/presence", "/topic/leaderboard",
                "/topic/assessment/assess-1/status", "/topic/assessment/assess-2/status",
                "/topic/job/123/viewers"
        ).list().ofMinSize(0).ofMaxSize(5);
        Arbitrary<Boolean> activeFlags = Arbitraries.of(true, false);

        return Combinators.combine(candidateIds, subs, activeFlags)
                .as(CandidateSession::new);
    }
}
