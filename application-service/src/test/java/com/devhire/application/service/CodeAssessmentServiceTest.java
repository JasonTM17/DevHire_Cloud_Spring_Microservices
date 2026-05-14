package com.devhire.application.service;

import com.devhire.application.client.AssessmentRunnerClient;
import com.devhire.application.dto.request.AssignCodeAssessmentRequest;
import com.devhire.application.dto.request.CodeReviewRequest;
import com.devhire.application.dto.request.CodeRunRequest;
import com.devhire.application.dto.request.CodeSubmissionRequest;
import com.devhire.application.dto.response.CodeAssessmentResponse;
import com.devhire.application.dto.response.CodeRunResponse;
import com.devhire.application.dto.response.CodeTestCaseResponse;
import com.devhire.application.dto.response.RubricScoreResponse;
import com.devhire.application.dto.response.StatusCountResponse;
import com.devhire.application.event.ApplicationEventPublisher;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CodeAssessmentServiceTest {
    private static final UUID ASSIGNMENT_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CANDIDATE_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID EMPLOYER_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID NON_CLOUD_CHALLENGE_ID = UUID.fromString("52000000-0000-0000-0001-000000000003");

    private final RecordingJdbcTemplate jdbcTemplate = new RecordingJdbcTemplate();
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
    private final CodeAssessmentService service = new CodeAssessmentService(
            jdbcTemplate, new ObjectMapper(), new CodeAssessmentGrader(), eventPublisher, new SimpleMeterRegistry());

    @Test
    void candidateSubmissionPersistsDeterministicScoreAndAuditEvents() {
        jdbcTemplate.assessments.add(assessment("ASSIGNED", null, null, null));
        jdbcTemplate.assessments.add(assessment("AUTO_REVIEWED", 88, "PASS", Instant.parse("2026-05-06T10:00:00Z")));

        var response = service.submit(candidate(), ASSIGNMENT_ID, new CodeSubmissionRequest("Java", """
                class CandidateSolution {
                    String solve(String input) {
                        ResourceValidator validator = new ResourceValidator(EnterpriseSecurityPolicy.STRICT, "production");
                        return validator.validate(input) ? "PASSED" : "REJECTED";
                    }
                }
                enum EnterpriseSecurityPolicy { STRICT }
                class ResourceValidator {
                    private final EnterpriseSecurityPolicy policy;
                    private final String requiredTag;
                    ResourceValidator(EnterpriseSecurityPolicy policy, String requiredTag) {
                        this.policy = policy;
                        this.requiredTag = requiredTag;
                    }
                    boolean validate(String input) {
                        return policy == EnterpriseSecurityPolicy.STRICT
                                && input != null
                                && input.contains("policy=STRICT")
                                && input.contains("tag=" + requiredTag);
                    }
                }
                """, "Includes runtime validation evidence."));

        assertThat(response.status()).isEqualTo("AUTO_REVIEWED");
        assertThat(jdbcTemplate.updates).anySatisfy(update -> {
            assertThat(update.sql()).contains("INSERT INTO code_submissions");
            assertThat(update.args()).contains("Java", true, 1, "static-rubric-v1", "devhire-code-rubric-v1");
        });
        assertThat(jdbcTemplate.updates).anySatisfy(update -> {
            assertThat(update.sql()).contains("UPDATE code_assessment_assignments");
            assertThat(update.sql()).contains("SUBMITTED");
            assertThat(update.args()).contains(ASSIGNMENT_ID, CANDIDATE_ID);
        });
        verify(eventPublisher, times(2)).publishAudit(any(AuditEvent.class));
        assertThat(response.latestRun()).isNotNull();
        assertThat(response.latestRun().hiddenPassed()).isZero();
        assertThat(response.latestRun().hiddenTotal()).isZero();
    }

    @Test
    void employerReviewFinalizesLatestSubmissionAndWritesReviewEvent() {
        jdbcTemplate.assessments.add(assessment("AUTO_REVIEWED", 78, "HOLD", Instant.parse("2026-05-06T10:00:00Z")));
        jdbcTemplate.assessments.add(assessment("PASSED", 91, "PASS", Instant.parse("2026-05-06T10:00:00Z")));

        var response = service.review(employer(), ASSIGNMENT_ID,
                new CodeReviewRequest("advance", "Strong production reasoning.", 91));

        assertThat(response.status()).isEqualTo("PASSED");
        assertThat(jdbcTemplate.updates).anySatisfy(update -> {
            assertThat(update.sql()).contains("UPDATE code_submissions");
            assertThat(update.args()).contains("PASS", 78, "Strong production reasoning.", ASSIGNMENT_ID);
        });
        assertThat(jdbcTemplate.updates).anySatisfy(update -> {
            assertThat(update.sql()).contains("INSERT INTO code_review_events");
            assertThat(update.args()).contains(ASSIGNMENT_ID, EMPLOYER_ID, "EMPLOYER", "PASS");
        });
        verify(eventPublisher).publishAudit(any(AuditEvent.class));
    }

    @Test
    void employerReviewRejectsAssignmentsWithoutSubmission() {
        jdbcTemplate.assessments.add(assessment("ASSIGNED", null, null, null));

        assertThatThrownBy(() -> service.review(employer(), ASSIGNMENT_ID,
                new CodeReviewRequest("hold", "Waiting for candidate code.", null)))
                .isInstanceOf(DevHireException.class)
                .hasMessageContaining("no submitted code");
    }

    @Test
    void employerAssignsDefaultJavaChallengeToOpenApplication() {
        jdbcTemplate.assessments.add(assessment("ASSIGNED", null, null, null));

        var response = service.assignToApplication(employer(), UUID.randomUUID(),
                new AssignCodeAssessmentRequest(null, null));

        assertThat(response.status()).isEqualTo("ASSIGNED");
        assertThat(jdbcTemplate.updates).anySatisfy(update -> {
            assertThat(update.sql()).contains("INSERT INTO code_assessment_assignments");
            assertThat(update.args()).contains("Candidate " + CANDIDATE_ID.toString().substring(0, 8));
        });
        verify(eventPublisher).publishAudit(any(AuditEvent.class));
    }

    @Test
    void employerCannotAssignNonCloudSeedChallengeInMvpFlow() {
        assertThatThrownBy(() -> service.assignToApplication(employer(), UUID.randomUUID(),
                new AssignCodeAssessmentRequest(NON_CLOUD_CHALLENGE_ID, null)))
                .isInstanceOf(DevHireException.class)
                .hasMessageContaining("Active Java cloud code challenge not found");

        assertThat(jdbcTemplate.updates).isEmpty();
    }

    @Test
    void candidateSubmissionRejectsExpiredAssignment() {
        jdbcTemplate.assessments.add(assessment("ASSIGNED", null, null, null, Instant.now().minusSeconds(60)));

        assertThatThrownBy(() -> service.submit(candidate(), ASSIGNMENT_ID, new CodeSubmissionRequest("Java", """
                class CandidateSolution {
                    String solve(String input) { return "PASSED"; }
                }
                """, "Submitting after deadline should be rejected.")))
                .isInstanceOf(DevHireException.class)
                .hasMessageContaining("submission window has closed");

        assertThat(jdbcTemplate.updates).isEmpty();
    }

    @Test
    void candidateSubmissionRejectsLanguageMismatch() {
        jdbcTemplate.assessments.add(assessment("ASSIGNED", null, null, null));

        assertThatThrownBy(() -> service.submit(candidate(), ASSIGNMENT_ID, new CodeSubmissionRequest("SQL", """
                SELECT status, count(*)
                FROM applications
                WHERE employer_id = current_setting('devhire.employer_id')::uuid
                GROUP BY status
                LIMIT 25
                """, "SQL evidence does not match the Java challenge.")))
                .isInstanceOf(DevHireException.class)
                .hasMessageContaining("must match the assigned challenge language");

        assertThat(jdbcTemplate.updates).isEmpty();
    }

    @Test
    void runnerClientFailureFailsClosedInsteadOfTrustingLocalFallback() {
        AssessmentRunnerClient runnerClient = mock(AssessmentRunnerClient.class);
        when(runnerClient.run(any())).thenThrow(new IllegalStateException("runner down"));
        CodeAssessmentService serviceWithRunner = new CodeAssessmentService(
                jdbcTemplate, new ObjectMapper(), new CodeAssessmentGrader(),
                eventPublisher, new SimpleMeterRegistry(), runnerClient);
        jdbcTemplate.assessments.add(assessment("ASSIGNED", null, null, null));

        assertThatThrownBy(() -> serviceWithRunner.submit(candidate(), ASSIGNMENT_ID, new CodeSubmissionRequest("Java", """
                class CandidateSolution {
                    String solve(String input) { return "PASSED"; }
                }
                """, "Runner outage should not create a trusted local pass.")))
                .isInstanceOf(DevHireException.class)
                .hasMessageContaining("trusted final score");

        assertThat(jdbcTemplate.updates).anySatisfy(update -> {
            assertThat(update.sql()).contains("INSERT INTO code_assessment_runs");
            assertThat(update.args()).contains("FAILED", "sandbox-runner-unavailable");
        });
        assertThat(jdbcTemplate.updates).noneSatisfy(update -> assertThat(update.sql()).contains("INSERT INTO code_submissions"));
    }

    @Test
    void visibleRunDoesNotTrustSignalsStuffedIntoStringsOrComments() {
        jdbcTemplate.assessments.add(assessment("ASSIGNED", null, null, null));

        CodeRunResponse response = service.runVisibleCases(candidate(), ASSIGNMENT_ID, new CodeRunRequest("Java", """
                class CandidateSolution {
                    // PASSED
                    String copiedVisibleAnswer = "PASSED";
                    String solve(String input) { return "REJECTED"; }
                }
                """, List.of(), null, 180));

        assertThat(response.visiblePassed()).isZero();
        assertThat(response.visibleTotal()).isEqualTo(1);
        assertThat(response.hiddenPassed()).isZero();
        assertThat(response.hiddenTotal()).isZero();
        assertThat(response.results()).allSatisfy(result -> {
            assertThat(result.visibility()).isEqualTo("VISIBLE");
            assertThat(result.passed()).isFalse();
        });
    }

    @Test
    void listResponsesRemoveRawCodeAndRedactSecretLikePreview() {
        jdbcTemplate.assessments.add(assessmentWithCode("""
                class CandidateSolution {
                    String password = "super-secret-demo-value";
                    String token = "eyJhbGciOiJIUzI1NiJ9.demo.payload";
                    @Test void provesRetry() { assert true; }
                }
                """));

        var responses = service.candidateAssessments(candidate());

        assertThat(responses).hasSize(1);
        assertThat(responses.getFirst().submittedCode()).isNull();
        assertThat(responses.getFirst().submittedCodePreview())
                .contains("password=<redacted>")
                .contains("token=<redacted>")
                .doesNotContain("super-secret-demo-value")
                .doesNotContain("eyJhbGci");
    }

    @Test
    void candidateDetailKeepsOwnSubmittedCodeButRedactsHiddenRunCounts() {
        jdbcTemplate.assessments.add(assessmentWithCode("""
                class CandidateSolution {
                    @Test void provesRetry() { assert true; }
                }
                """));

        var response = service.candidateAssessment(candidate(), ASSIGNMENT_ID);

        assertThat(response.submittedCode()).contains("CandidateSolution");
        assertThat(response.latestRun()).isNotNull();
        assertThat(response.latestRun().visiblePassed()).isEqualTo(2);
        assertThat(response.latestRun().visibleTotal()).isEqualTo(2);
        assertThat(response.latestRun().hiddenPassed()).isZero();
        assertThat(response.latestRun().hiddenTotal()).isZero();
        assertThat(response.latestRun().results()).allSatisfy(result -> assertThat(result.visibility()).isEqualTo("VISIBLE"));
    }

    @Test
    void adminSummaryAggregatesAssessmentHealthForOperationsDashboard() {
        var summary = service.adminSummary(admin());

        assertThat(summary.totalAssignments()).isEqualTo(8);
        assertThat(summary.submitted()).isEqualTo(6);
        assertThat(summary.autoReviewed()).isEqualTo(3);
        assertThat(summary.employerReviewed()).isEqualTo(1);
        assertThat(summary.passed()).isEqualTo(1);
        assertThat(summary.failed()).isEqualTo(1);
        assertThat(summary.averageScore()).isEqualTo(82.3);
        assertThat(summary.riskySubmissions()).isEqualTo(2);
        assertThat(summary.runQueueDepth()).isEqualTo(0);
        assertThat(summary.sandboxFailureRate()).isEqualTo(4.2);
        assertThat(summary.acceptedRate()).isEqualTo(91.0);
        assertThat(summary.wrongAnswerRate()).isEqualTo(3.5);
        assertThat(summary.compileErrorRate()).isEqualTo(3.0);
        assertThat(summary.timeoutRate()).isEqualTo(2.0);
        assertThat(summary.runnerUnavailableRate()).isEqualTo(1.0);
        assertThat(summary.policyBlockedRate()).isEqualTo(0.5);
        assertThat(summary.averageRuntimeMs()).isEqualTo(128.1);
        assertThat(summary.p95ExecutionMs()).isEqualTo(244.0);
        assertThat(summary.averageIntegrityRisk()).isEqualTo(12.6);
        assertThat(summary.averageSimilarityScore()).isEqualTo(7.7);
        assertThat(summary.statusDistribution()).extracting(StatusCountResponse::status)
                .containsExactly("ASSIGNED", "AUTO_REVIEWED", "EMPLOYER_REVIEWED", "FAILED", "PASSED");
    }

    @Test
    void candidateAssessmentListRequiresCandidateRole() {
        assertThatThrownBy(() -> service.candidateAssessments(employer()))
                .isInstanceOf(DevHireException.class)
                .hasMessageContaining("Required role: CANDIDATE");
    }

    private static CodeAssessmentResponse assessment(String status, Integer latestScore, String decision, Instant submittedAt) {
        return assessment(status, latestScore, decision, submittedAt, Instant.now().plusSeconds(1_209_600));
    }

    private static CodeAssessmentResponse assessment(String status,
                                                     Integer latestScore,
                                                     String decision,
                                                     Instant submittedAt,
                                                     Instant dueAt) {
        String submittedCode = submittedAt == null ? null
                : "class CandidateSolution { String solve(String input) { return \"PASSED\"; } }";
        return assessmentWithCode(status, latestScore, decision, submittedAt, dueAt, submittedCode);
    }

    private static CodeAssessmentResponse assessmentWithCode(String submittedCode) {
        return assessmentWithCode("AUTO_REVIEWED", 88, "PASS", Instant.parse("2026-05-06T10:00:00Z"),
                Instant.now().plusSeconds(1_209_600), submittedCode);
    }

    private static CodeAssessmentResponse assessmentWithCode(String status,
                                                            Integer latestScore,
                                                            String decision,
                                                            Instant submittedAt,
                                                            Instant dueAt,
                                                            String submittedCode) {
        return new CodeAssessmentResponse(
                ASSIGNMENT_ID,
                UUID.randomUUID(),
                "Linh Tran",
                "Senior Distributed Systems Engineer",
                "Java outbox retry reviewer",
                1,
                "Senior",
                "Java",
                "Implement idempotent outbox retry review.",
                "No network calls. Explain retry boundaries.",
                "class Solution {}",
                status,
                100,
                latestScore,
                decision,
                List.of("Java", "Outbox", "Testing"),
                latestScore == null ? List.of() : List.of(new RubricScoreResponse("Correctness", latestScore, 100, "Reviewed")),
                latestScore == null ? List.of() : List.of("low-signal-code"),
                latestScore == null ? null : "Review completed.",
                true,
                submittedCode,
                submittedAt == null ? null : 1,
                submittedAt == null ? null : "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                "static-rubric-v1",
                "devhire-code-rubric-v1",
                submittedCode,
                submittedAt != null,
                List.of(new CodeTestCaseResponse(UUID.randomUUID(), "Visible retry cap", "VISIBLE", "poison event", 15)),
                submittedAt == null ? null : new CodeRunResponse(
                        UUID.randomUUID(),
                        "COMPLETED",
                        "JUDGE0_COMPATIBLE_LOCAL_SANDBOX",
                        2,
                        2,
                        1,
                        1,
                        92,
                        20_480,
                        null,
                        12.6,
                        7.7,
                        List.of(),
                        Instant.parse("2026-05-06T09:59:00Z"),
                        Instant.parse("2026-05-06T10:00:00Z")),
                submittedAt == null ? 0 : 12.6,
                submittedAt == null ? 0 : 7.7,
                "JUDGE0_COMPATIBLE_LOCAL_SANDBOX",
                dueAt,
                Instant.parse("2026-05-01T00:00:00Z"),
                submittedAt);
    }

    private static AuthenticatedUser candidate() {
        return new AuthenticatedUser(CANDIDATE_ID, "candidate@devhire.local", UserRole.CANDIDATE);
    }

    private static AuthenticatedUser employer() {
        return new AuthenticatedUser(EMPLOYER_ID, "employer@devhire.local", UserRole.EMPLOYER);
    }

    private static AuthenticatedUser admin() {
        return new AuthenticatedUser(UUID.randomUUID(), "admin@devhire.local", UserRole.ADMIN);
    }

    private static final class RecordingJdbcTemplate extends JdbcTemplate {
        private final ArrayDeque<CodeAssessmentResponse> assessments = new ArrayDeque<>();
        private final List<RecordedUpdate> updates = new ArrayList<>();

        @Override
        public <T> T queryForObject(String sql, RowMapper<T> rowMapper) {
            return queryForObject(sql, rowMapper, new Object[0]);
        }

        @Override
        public <T> T queryForObject(String sql, RowMapper<T> rowMapper, Object... args) {
            if (sql.stripLeading().startsWith("SELECT COALESCE(cv.required_signals_csv")) {
                return cast(List.of("CandidateSolution", "solve", "ResourceValidator",
                        "EnterpriseSecurityPolicy.STRICT", "production", "PASSED", "REJECTED"));
            }
            if (sql.contains("SELECT a.challenge_id") && sql.contains("challenge_version")) {
                return challengeRef(rowMapper);
            }
            if (sql.contains("FROM job_applications")) {
                return applicationTarget(rowMapper);
            }
            if (sql.stripLeading().startsWith("SELECT id, title, language")) {
                if (args.length > 0 && NON_CLOUD_CHALLENGE_ID.equals(args[0])) {
                    throw new EmptyResultDataAccessException(1);
                }
                return challenge(rowMapper);
            }
            return cast(assessments.removeFirst());
        }

        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
            if (sql.contains("FOR UPDATE")) {
                return requiredType.cast(1);
            }
            if (sql.stripLeading().startsWith("SELECT challenge_id")) {
                return requiredType.cast(UUID.fromString("52000000-0000-0000-0001-000000000001"));
            }
            if (sql.stripLeading().startsWith("SELECT id")
                    && sql.contains("FROM code_assessment_assignments")
                    && sql.contains("application_id")) {
                return requiredType.cast(ASSIGNMENT_ID);
            }
            return scalar(sql, requiredType, args);
        }

        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType) {
            return scalar(sql, requiredType, new Object[0]);
        }

        private static <T> T scalar(String sql, Class<T> requiredType, Object... args) {
            if (requiredType == Integer.class) {
                return requiredType.cast(1);
            }
            if (sql.contains("risk_flags_csv")) {
                return requiredType.cast(2L);
            }
            if (sql.contains("avg(final_score)")) {
                return requiredType.cast(82.34);
            }
            if (sql.contains("avg(CASE WHEN status IN")) {
                return requiredType.cast(4.24);
            }
            if (sql.contains("verdict = ?")) {
                String verdict = String.valueOf(args[0]);
                double value = switch (verdict) {
                    case "ACCEPTED" -> 91.04;
                    case "WRONG_ANSWER" -> 3.54;
                    case "COMPILE_ERROR" -> 3.04;
                    case "TIME_LIMIT_EXCEEDED" -> 2.04;
                    case "TIME_LIMIT" -> 0.0;
                    case "RUNNER_UNAVAILABLE" -> 1.04;
                    case "POLICY_BLOCKED" -> 0.54;
                    default -> 0.0;
                };
                return requiredType.cast(value);
            }
            if (sql.contains("avg(execution_time_ms)")) {
                return requiredType.cast(128.14);
            }
            if (sql.contains("percentile_cont")) {
                return requiredType.cast(244.04);
            }
            if (sql.contains("avg(integrity_risk_score)")) {
                return requiredType.cast(12.55);
            }
            if (sql.contains("avg(similarity_score)")) {
                return requiredType.cast(7.72);
            }
            return requiredType.cast(0L);
        }

        @Override
        public <T> List<T> query(String sql, RowMapper<T> rowMapper) {
            return query(sql, rowMapper, new Object[0]);
        }

        @Override
        public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
            if (sql.contains("GROUP BY status")) {
                return List.of(
                        row(rowMapper, "ASSIGNED", 2),
                        row(rowMapper, "AUTO_REVIEWED", 3),
                        row(rowMapper, "EMPLOYER_REVIEWED", 1),
                        row(rowMapper, "FAILED", 1),
                        row(rowMapper, "PASSED", 1));
            }
            if (sql.contains("FROM code_challenge_test_cases")) {
                return List.of(
                        testCase(rowMapper, "Runtime solve contract", "VISIBLE",
                                "resource=res-9982;policy=STRICT;tag=production", "PASSED", 15),
                        testCase(rowMapper, "Private validation case B", "HIDDEN",
                                "resource=res-hidden-2;policy=STRICT", "REJECTED", 20));
            }
            if (sql.contains("FROM code_assessment_run_results")) {
                return List.of();
            }
            if (sql.contains("SELECT s.code_text")) {
                return List.of();
            }
            if (!assessments.isEmpty()) {
                var rows = new ArrayList<T>();
                while (!assessments.isEmpty()) {
                    rows.add(cast(assessments.removeFirst()));
                }
                return rows;
            }
            return List.of();
        }

        @Override
        public int update(String sql, Object... args) {
            updates.add(new RecordedUpdate(sql, java.util.Arrays.asList(args)));
            return 1;
        }

        private static <T> T row(RowMapper<T> mapper, String status, long count) {
            try {
                ResultSet rs = mock(ResultSet.class);
                when(rs.getString("status")).thenReturn(status);
                when(rs.getLong("total")).thenReturn(count);
                return mapper.mapRow(rs, 0);
            } catch (Exception ex) {
                throw new AssertionError(ex);
            }
        }

        private static <T> T testCase(RowMapper<T> mapper,
                                      String name,
                                      String visibility,
                                      String input,
                                      String expected,
                                      int weight) {
            try {
                ResultSet rs = mock(ResultSet.class);
                when(rs.getObject("id", UUID.class)).thenReturn(UUID.randomUUID());
                when(rs.getString("name")).thenReturn(name);
                when(rs.getString("visibility")).thenReturn(visibility);
                when(rs.getString("input_text")).thenReturn(input);
                when(rs.getString("expected_output")).thenReturn(expected);
                when(rs.getString("setup_sql")).thenReturn(null);
                when(rs.getString("expected_rows_json")).thenReturn(null);
                when(rs.getInt("weight")).thenReturn(weight);
                when(rs.getInt("ordinal")).thenReturn(1);
                when(rs.getInt("version")).thenReturn(1);
                return mapper.mapRow(rs, 0);
            } catch (Exception ex) {
                throw new AssertionError(ex);
            }
        }

        private static <T> T challengeRef(RowMapper<T> mapper) {
            try {
                ResultSet rs = mock(ResultSet.class);
                when(rs.getObject("challenge_id", UUID.class))
                        .thenReturn(UUID.fromString("52000000-0000-0000-0001-000000000001"));
                when(rs.getInt("challenge_version")).thenReturn(1);
                return mapper.mapRow(rs, 0);
            } catch (Exception ex) {
                throw new AssertionError(ex);
            }
        }

        private static <T> T applicationTarget(RowMapper<T> mapper) {
            try {
                ResultSet rs = mock(ResultSet.class);
                when(rs.getObject("id", UUID.class)).thenReturn(UUID.randomUUID());
                when(rs.getObject("candidate_id", UUID.class)).thenReturn(CANDIDATE_ID);
                when(rs.getObject("employer_id", UUID.class)).thenReturn(EMPLOYER_ID);
                when(rs.getObject("job_id", UUID.class)).thenReturn(UUID.randomUUID());
                when(rs.getString("job_title")).thenReturn("Senior Java Platform Engineer");
                when(rs.getString("status")).thenReturn("REVIEWING");
                return mapper.mapRow(rs, 0);
            } catch (Exception ex) {
                throw new AssertionError(ex);
            }
        }

        private static <T> T challenge(RowMapper<T> mapper) {
            try {
                ResultSet rs = mock(ResultSet.class);
                when(rs.getObject("id", UUID.class)).thenReturn(UUID.fromString("52000000-0000-0000-0001-000000000001"));
                when(rs.getString("title")).thenReturn("Cloud Architecture Challenge");
                when(rs.getString("language")).thenReturn("Java");
                when(rs.getInt("version")).thenReturn(1);
                return mapper.mapRow(rs, 0);
            } catch (Exception ex) {
                throw new AssertionError(ex);
            }
        }

        @SuppressWarnings("unchecked")
        private static <T> T cast(Object value) {
            return (T) value;
        }
    }

    private record RecordedUpdate(String sql, List<Object> args) {
    }
}
