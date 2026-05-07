package com.devhire.application.service;

import com.devhire.application.dto.request.CodeReviewRequest;
import com.devhire.application.dto.request.CodeSubmissionRequest;
import com.devhire.application.dto.response.CodeAssessmentResponse;
import com.devhire.application.dto.response.CodeAssessmentSummaryResponse;
import com.devhire.application.dto.response.RubricScoreResponse;
import com.devhire.application.dto.response.StatusCountResponse;
import com.devhire.application.event.ApplicationEventPublisher;
import com.devhire.common.error.ErrorCode;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class CodeAssessmentService {
    private static final TypeReference<List<RubricScoreResponse>> RUBRIC_TYPE = new TypeReference<>() {
    };
    private static final String SELECT_ASSESSMENT = """
            SELECT a.id AS assignment_id, a.application_id, a.candidate_id, a.employer_id, a.job_id,
                   a.candidate_name, a.job_title, a.status AS assignment_status, a.due_at, a.assigned_at,
                   c.title AS challenge_title, c.level, c.language, c.prompt, c.constraints_text,
                   c.starter_code, c.skills_csv, c.required_signals_csv, c.max_score,
                   s.id AS submission_id, s.language AS submission_language, s.code_text, s.final_score,
                   s.decision, s.rubric_json::text AS rubric_json, s.risk_flags_csv, s.feedback,
                   s.ai_feedback_fallback, s.submitted_at
            FROM code_assessment_assignments a
            JOIN code_challenges c ON c.id = a.challenge_id
            LEFT JOIN LATERAL (
                SELECT *
                FROM code_submissions s
                WHERE s.assignment_id = a.id
                ORDER BY s.submitted_at DESC
                LIMIT 1
            ) s ON true
            """;

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final CodeAssessmentGrader grader;
    private final ApplicationEventPublisher eventPublisher;

    public CodeAssessmentService(JdbcTemplate jdbcTemplate,
                                 ObjectMapper objectMapper,
                                 CodeAssessmentGrader grader,
                                 ApplicationEventPublisher eventPublisher) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.grader = grader;
        this.eventPublisher = eventPublisher;
    }

    @Transactional(readOnly = true)
    public List<CodeAssessmentResponse> candidateAssessments(AuthenticatedUser candidate) {
        requireRole(candidate, UserRole.CANDIDATE);
        return jdbcTemplate.query(SELECT_ASSESSMENT + """
                WHERE a.candidate_id = ?
                ORDER BY a.due_at ASC, a.assigned_at DESC
                """, mapper(), candidate.id());
    }

    @Transactional(readOnly = true)
    public CodeAssessmentResponse candidateAssessment(AuthenticatedUser candidate, UUID assignmentId) {
        requireRole(candidate, UserRole.CANDIDATE);
        return findForOwner(assignmentId, "a.candidate_id = ?", candidate.id());
    }

    @Transactional
    public CodeAssessmentResponse submit(AuthenticatedUser candidate, UUID assignmentId, CodeSubmissionRequest request) {
        requireRole(candidate, UserRole.CANDIDATE);
        CodeAssessmentResponse assessment = candidateAssessment(candidate, assignmentId);
        if (List.of("PASSED", "FAILED").contains(assessment.status())) {
            throw new DevHireException(ErrorCode.CONFLICT, "Assessment has already been finalized by the employer");
        }
        CodeAssessmentGrader.GradeResult result = grader.grade(request.code(), requiredSignals(assignmentId));
        UUID submissionId = UUID.randomUUID();
        jdbcTemplate.update("""
                        INSERT INTO code_submissions (
                            id, assignment_id, language, code_text, candidate_notes, static_score, final_score,
                            decision, rubric_json, risk_flags_csv, feedback, ai_feedback_fallback, status, submitted_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb), ?, ?, ?, 'AUTO_REVIEWED', now())
                        """,
                submissionId,
                assignmentId,
                normalizeLanguage(request.language()),
                request.code().trim(),
                blankToNull(request.notes()),
                result.totalScore(),
                result.totalScore(),
                autoDecision(result.totalScore(), result.riskFlags()),
                writeJson(result.rubric()),
                String.join(",", result.riskFlags()),
                result.feedback(),
                true);
        jdbcTemplate.update("""
                        UPDATE code_assessment_assignments
                        SET status = 'AUTO_REVIEWED', updated_at = now()
                        WHERE id = ? AND candidate_id = ?
                        """, assignmentId, candidate.id());
        publishAudit(candidate, "CODE_SUBMITTED", assignmentId, Map.of(
                "submissionId", submissionId.toString(),
                "score", result.totalScore(),
                "riskFlags", result.riskFlags()));
        publishAudit(candidate, "CODE_AUTO_REVIEWED", assignmentId, Map.of(
                "submissionId", submissionId.toString(),
                "decision", autoDecision(result.totalScore(), result.riskFlags())));
        return candidateAssessment(candidate, assignmentId);
    }

    @Transactional(readOnly = true)
    public List<CodeAssessmentResponse> employerAssessments(AuthenticatedUser employer, String status, UUID jobId) {
        requireRole(employer, UserRole.EMPLOYER);
        if ((status == null || status.isBlank()) && jobId == null) {
            return jdbcTemplate.query(SELECT_ASSESSMENT + """
                    WHERE a.employer_id = ?
                    ORDER BY a.updated_at DESC, a.due_at ASC
                    """, mapper(), employer.id());
        }
        if (status == null || status.isBlank()) {
            return jdbcTemplate.query(SELECT_ASSESSMENT + """
                    WHERE a.employer_id = ? AND a.job_id = ?
                    ORDER BY a.updated_at DESC, a.due_at ASC
                    """, mapper(), employer.id(), jobId);
        }
        if (jobId == null) {
            return jdbcTemplate.query(SELECT_ASSESSMENT + """
                    WHERE a.employer_id = ? AND a.status = ?
                    ORDER BY a.updated_at DESC, a.due_at ASC
                    """, mapper(), employer.id(), status.toUpperCase(Locale.ROOT));
        }
        return jdbcTemplate.query(SELECT_ASSESSMENT + """
                WHERE a.employer_id = ? AND a.status = ? AND a.job_id = ?
                ORDER BY a.updated_at DESC, a.due_at ASC
                """, mapper(), employer.id(), status.toUpperCase(Locale.ROOT), jobId);
    }

    @Transactional(readOnly = true)
    public CodeAssessmentResponse employerAssessment(AuthenticatedUser employer, UUID assignmentId) {
        requireRole(employer, UserRole.EMPLOYER);
        return findForOwner(assignmentId, "a.employer_id = ?", employer.id());
    }

    @Transactional
    public CodeAssessmentResponse review(AuthenticatedUser employer, UUID assignmentId, CodeReviewRequest request) {
        requireRole(employer, UserRole.EMPLOYER);
        CodeAssessmentResponse assessment = employerAssessment(employer, assignmentId);
        if (assessment.submittedAt() == null) {
            throw new DevHireException(ErrorCode.BAD_REQUEST, "Assessment has no submitted code to review");
        }
        String decision = normalizeDecision(request.decision());
        int finalScore = request.finalScore() == null
                ? (assessment.latestScore() == null ? 0 : assessment.latestScore())
                : request.finalScore();
        String status = switch (decision) {
            case "ADVANCE" -> "PASSED";
            case "REJECT" -> "FAILED";
            default -> "EMPLOYER_REVIEWED";
        };
        jdbcTemplate.update("""
                        UPDATE code_submissions
                        SET decision = ?, final_score = ?, employer_feedback = ?, status = 'EMPLOYER_REVIEWED',
                            reviewed_at = now(), updated_at = now()
                        WHERE id = (
                            SELECT id FROM code_submissions
                            WHERE assignment_id = ?
                            ORDER BY submitted_at DESC
                            LIMIT 1
                        )
                        """, decision, finalScore, blankToNull(request.note()), assignmentId);
        jdbcTemplate.update("""
                        UPDATE code_assessment_assignments
                        SET status = ?, updated_at = now()
                        WHERE id = ? AND employer_id = ?
                        """, status, assignmentId, employer.id());
        jdbcTemplate.update("""
                        INSERT INTO code_review_events (id, assignment_id, actor_id, actor_role, action, note, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, now())
                        """, UUID.randomUUID(), assignmentId, employer.id(), employer.role().name(), decision,
                blankToNull(request.note()));
        publishAudit(employer, "CODE_REVIEW_COMPLETED", assignmentId,
                Map.of("decision", decision, "finalScore", finalScore));
        return employerAssessment(employer, assignmentId);
    }

    @Transactional(readOnly = true)
    public CodeAssessmentSummaryResponse adminSummary(AuthenticatedUser admin) {
        requireRole(admin, UserRole.ADMIN);
        List<StatusCountResponse> distribution = jdbcTemplate.query("""
                SELECT status, count(*) AS total
                FROM code_assessment_assignments
                GROUP BY status
                ORDER BY status
                """, (rs, rowNum) -> new StatusCountResponse(rs.getString("status"), rs.getLong("total")));
        Long risky = jdbcTemplate.queryForObject("""
                SELECT count(*)
                FROM code_submissions
                WHERE risk_flags_csv IS NOT NULL AND risk_flags_csv <> ''
                """, Long.class);
        Double average = jdbcTemplate.queryForObject("""
                SELECT COALESCE(avg(final_score), 0)
                FROM code_submissions
                """, Double.class);
        return new CodeAssessmentSummaryResponse(
                sum(distribution),
                count(distribution, "SUBMITTED") + count(distribution, "AUTO_REVIEWED")
                        + count(distribution, "EMPLOYER_REVIEWED") + count(distribution, "PASSED")
                        + count(distribution, "FAILED"),
                count(distribution, "AUTO_REVIEWED"),
                count(distribution, "EMPLOYER_REVIEWED"),
                count(distribution, "PASSED"),
                count(distribution, "FAILED"),
                average == null ? 0 : Math.round(average * 10.0) / 10.0,
                risky == null ? 0 : risky,
                distribution);
    }

    private CodeAssessmentResponse findForOwner(UUID assignmentId, String ownerPredicate, UUID ownerId) {
        try {
            return jdbcTemplate.queryForObject(SELECT_ASSESSMENT + " WHERE a.id = ? AND " + ownerPredicate,
                    mapper(), assignmentId, ownerId);
        } catch (EmptyResultDataAccessException ex) {
            throw new DevHireException(ErrorCode.NOT_FOUND, "Code assessment not found");
        }
    }

    private List<String> requiredSignals(UUID assignmentId) {
        return jdbcTemplate.queryForObject("""
                SELECT c.required_signals_csv
                FROM code_assessment_assignments a
                JOIN code_challenges c ON c.id = a.challenge_id
                WHERE a.id = ?
                """, (rs, rowNum) -> splitCsv(rs.getString("required_signals_csv")), assignmentId);
    }

    private RowMapper<CodeAssessmentResponse> mapper() {
        return (rs, rowNum) -> new CodeAssessmentResponse(
                rs.getObject("assignment_id", UUID.class),
                rs.getObject("application_id", UUID.class),
                rs.getString("candidate_name"),
                rs.getString("job_title"),
                rs.getString("challenge_title"),
                rs.getString("level"),
                firstNonBlank(rs.getString("submission_language"), rs.getString("language")),
                rs.getString("prompt"),
                rs.getString("constraints_text"),
                rs.getString("starter_code"),
                rs.getString("assignment_status"),
                rs.getInt("max_score"),
                nullableInt(rs, "final_score"),
                rs.getString("decision"),
                splitCsv(rs.getString("skills_csv")),
                readRubric(rs.getString("rubric_json")),
                splitCsv(rs.getString("risk_flags_csv")),
                rs.getString("feedback"),
                rs.getBoolean("ai_feedback_fallback"),
                rs.getString("code_text"),
                instant(rs.getTimestamp("due_at")),
                instant(rs.getTimestamp("assigned_at")),
                instant(rs.getTimestamp("submitted_at")));
    }

    private List<RubricScoreResponse> readRubric(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(value, RUBRIC_TYPE);
        } catch (JsonProcessingException ex) {
            return List.of();
        }
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new DevHireException(ErrorCode.INTERNAL_ERROR, "Cannot serialize rubric score");
        }
    }

    private void publishAudit(AuthenticatedUser actor, String action, UUID assignmentId, Map<String, Object> metadata) {
        eventPublisher.publishAudit(AuditEvent.now(actor.id(), actor.email(), actor.role().name(), action,
                "code_assessment", assignmentId.toString(), metadata));
    }

    private static String autoDecision(int score, List<String> flags) {
        if (score >= 85 && flags.stream().noneMatch(flag -> flag.equals("hardcoded-secret") || flag.equals("process-execution"))) {
            return "ADVANCE";
        }
        if (score < 65 || flags.contains("hardcoded-secret") || flags.contains("process-execution")) {
            return "HOLD";
        }
        return "REVIEW";
    }

    private static String normalizeDecision(String value) {
        String decision = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (!List.of("ADVANCE", "HOLD", "REJECT").contains(decision)) {
            throw new DevHireException(ErrorCode.BAD_REQUEST, "Review decision must be ADVANCE, HOLD, or REJECT");
        }
        return decision;
    }

    private static String normalizeLanguage(String value) {
        return value == null ? "Java" : value.trim();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    private static Integer nullableInt(ResultSet rs, String column) throws SQLException {
        int value = rs.getInt(column);
        return rs.wasNull() ? null : value;
    }

    private static List<String> splitCsv(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .toList();
    }

    private static String firstNonBlank(String first, String fallback) {
        return first == null || first.isBlank() ? fallback : first;
    }

    private static long sum(List<StatusCountResponse> counts) {
        return counts.stream().mapToLong(StatusCountResponse::count).sum();
    }

    private static long count(List<StatusCountResponse> counts, String status) {
        return counts.stream()
                .filter(item -> item.status().equals(status))
                .mapToLong(StatusCountResponse::count)
                .findFirst()
                .orElse(0);
    }

    private static void requireRole(AuthenticatedUser user, UserRole role) {
        if (user.role() != role) {
            throw new DevHireException(ErrorCode.FORBIDDEN, "Required role: " + role);
        }
    }
}
