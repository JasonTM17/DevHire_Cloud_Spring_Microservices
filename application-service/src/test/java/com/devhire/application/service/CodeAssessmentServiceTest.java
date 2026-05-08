package com.devhire.application.service;

import com.devhire.application.dto.request.CodeReviewRequest;
import com.devhire.application.dto.request.CodeSubmissionRequest;
import com.devhire.application.dto.response.CodeAssessmentResponse;
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

    private final RecordingJdbcTemplate jdbcTemplate = new RecordingJdbcTemplate();
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
    private final CodeAssessmentService service = new CodeAssessmentService(
            jdbcTemplate, new ObjectMapper(), new CodeAssessmentGrader(), eventPublisher, new SimpleMeterRegistry());

    @Test
    void candidateSubmissionPersistsDeterministicScoreAndAuditEvents() {
        jdbcTemplate.assessments.add(assessment("ASSIGNED", null, null, null));
        jdbcTemplate.assessments.add(assessment("AUTO_REVIEWED", 88, "ADVANCE", Instant.parse("2026-05-06T10:00:00Z")));

        var response = service.submit(candidate(), ASSIGNMENT_ID, new CodeSubmissionRequest("Java", """
                public class RetryReview {
                    private final Map<String, Integer> attempts = new HashMap<>();
                    @Test void givenOutboxWhenRetryThenDeduplicates() { assert attempts.size() >= 0; }
                    public void handle(String outboxEvent, int retryCount) {
                        // retry idempotent outbox publication with page limit
                        attempts.put(outboxEvent, retryCount);
                    }
                }
                """, "Includes retry and outbox evidence."));

        assertThat(response.status()).isEqualTo("AUTO_REVIEWED");
        assertThat(jdbcTemplate.updates).anySatisfy(update -> {
            assertThat(update.sql()).contains("INSERT INTO code_submissions");
            assertThat(update.args()).contains("Java", true, 1, "static-rubric-v1", "devhire-code-rubric-v1");
        });
        assertThat(jdbcTemplate.updates).anySatisfy(update -> {
            assertThat(update.sql()).contains("UPDATE code_assessment_assignments");
            assertThat(update.sql()).contains("AUTO_REVIEWED");
            assertThat(update.args()).contains(ASSIGNMENT_ID, CANDIDATE_ID);
        });
        verify(eventPublisher, times(2)).publishAudit(any(AuditEvent.class));
    }

    @Test
    void employerReviewFinalizesLatestSubmissionAndWritesReviewEvent() {
        jdbcTemplate.assessments.add(assessment("AUTO_REVIEWED", 78, "REVIEW", Instant.parse("2026-05-06T10:00:00Z")));
        jdbcTemplate.assessments.add(assessment("PASSED", 91, "ADVANCE", Instant.parse("2026-05-06T10:00:00Z")));

        var response = service.review(employer(), ASSIGNMENT_ID,
                new CodeReviewRequest("advance", "Strong production reasoning.", 91));

        assertThat(response.status()).isEqualTo("PASSED");
        assertThat(jdbcTemplate.updates).anySatisfy(update -> {
            assertThat(update.sql()).contains("UPDATE code_submissions");
            assertThat(update.args()).contains("ADVANCE", 91, "Strong production reasoning.", ASSIGNMENT_ID);
        });
        assertThat(jdbcTemplate.updates).anySatisfy(update -> {
            assertThat(update.sql()).contains("INSERT INTO code_review_events");
            assertThat(update.args()).contains(ASSIGNMENT_ID, EMPLOYER_ID, "EMPLOYER", "ADVANCE");
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
    void candidateSubmissionRejectsExpiredAssignment() {
        jdbcTemplate.assessments.add(assessment("ASSIGNED", null, null, null, Instant.now().minusSeconds(60)));

        assertThatThrownBy(() -> service.submit(candidate(), ASSIGNMENT_ID, new CodeSubmissionRequest("Java", """
                class Solution {
                    @Test void provesBehavior() { assert true; }
                    void review() { /* outbox retry evidence */ }
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
        String submittedCode = submittedAt == null ? null : "class Solution { @Test void provesRetry() { assert true; } }";
        return assessmentWithCode(status, latestScore, decision, submittedAt, dueAt, submittedCode);
    }

    private static CodeAssessmentResponse assessmentWithCode(String submittedCode) {
        return assessmentWithCode("AUTO_REVIEWED", 88, "ADVANCE", Instant.parse("2026-05-06T10:00:00Z"),
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
                latestScore == null ? List.of() : List.of("missing-test-evidence"),
                latestScore == null ? null : "Review completed.",
                true,
                submittedCode,
                submittedAt == null ? null : 1,
                submittedAt == null ? null : "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                "static-rubric-v1",
                "devhire-code-rubric-v1",
                submittedCode,
                submittedAt != null,
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
        public <T> T queryForObject(String sql, RowMapper<T> rowMapper, Object... args) {
            if (sql.stripLeading().startsWith("SELECT c.required_signals_csv")) {
                return cast(List.of("outbox", "retry", "assert", "page"));
            }
            return cast(assessments.removeFirst());
        }

        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType, Object... args) {
            if (sql.contains("FOR UPDATE")) {
                return requiredType.cast(1);
            }
            return scalar(sql, requiredType);
        }

        @Override
        public <T> T queryForObject(String sql, Class<T> requiredType) {
            return scalar(sql, requiredType);
        }

        private static <T> T scalar(String sql, Class<T> requiredType) {
            if (requiredType == Integer.class) {
                return requiredType.cast(1);
            }
            if (sql.contains("risk_flags_csv")) {
                return requiredType.cast(2L);
            }
            if (sql.contains("avg(final_score)")) {
                return requiredType.cast(82.34);
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
            updates.add(new RecordedUpdate(sql, List.of(args)));
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

        @SuppressWarnings("unchecked")
        private static <T> T cast(Object value) {
            return (T) value;
        }
    }

    private record RecordedUpdate(String sql, List<Object> args) {
    }
}
