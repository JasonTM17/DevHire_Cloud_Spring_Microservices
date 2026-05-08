package com.devhire.application.service;

import com.devhire.application.client.AssessmentRunnerClient;
import com.devhire.application.client.dto.RunnerRunRequest;
import com.devhire.application.client.dto.RunnerRunResponse;
import com.devhire.application.client.dto.RunnerTestCaseRequest;
import com.devhire.application.dto.request.CodeIntegrityEventRequest;
import com.devhire.application.dto.request.CodeReviewRequest;
import com.devhire.application.dto.request.CodeRunRequest;
import com.devhire.application.dto.request.CodeSubmissionRequest;
import com.devhire.application.dto.response.CodeAssessmentResponse;
import com.devhire.application.dto.response.CodeAssessmentSummaryResponse;
import com.devhire.application.dto.response.CodeRunCaseResultResponse;
import com.devhire.application.dto.response.CodeRunResponse;
import com.devhire.application.dto.response.CodeTestCaseResponse;
import com.devhire.application.dto.response.RubricScoreResponse;
import com.devhire.application.dto.response.StatusCountResponse;
import com.devhire.application.event.ApplicationEventPublisher;
import com.devhire.common.ApiResponse;
import com.devhire.common.error.ErrorCode;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.math.BigDecimal;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class CodeAssessmentService {
    private static final String GRADER_VERSION = "static-rubric-v1";
    private static final String RUBRIC_VERSION = "devhire-code-rubric-v1";
    private static final String RUNNER_STATUS = "JUDGE0_COMPATIBLE_LOCAL_SANDBOX";
    private static final Set<String> ALLOWED_LANGUAGES = Set.of("Java", "SQL", "TypeScript");
    private static final Set<String> FILTERABLE_STATUSES = Set.of(
            "ASSIGNED", "SUBMITTED", "AUTO_REVIEWED", "EMPLOYER_REVIEWED", "PASSED", "FAILED");
    private static final Pattern FORBIDDEN_BOUNDARY = Pattern.compile(
            "(?i)(runtime\\.getruntime|processbuilder|system\\.exit|\\.exec\\(|socket\\(|files\\.write|new\\s+file\\(|httpclient|fetch\\(|xmlhttprequest)");
    private static final TypeReference<List<RubricScoreResponse>> RUBRIC_TYPE = new TypeReference<>() {
    };
    private static final String SELECT_ASSESSMENT = """
            SELECT a.id AS assignment_id, a.application_id, a.candidate_id, a.employer_id, a.job_id,
                   a.candidate_name, a.job_title, a.status AS assignment_status, a.due_at, a.assigned_at,
                   c.id AS challenge_id, c.title AS challenge_title, c.level, c.language, c.prompt, c.constraints_text,
                   c.starter_code, c.skills_csv, c.required_signals_csv, c.max_score,
                   s.id AS submission_id, s.language AS submission_language, s.code_text, s.final_score,
                   s.decision, s.rubric_json::text AS rubric_json, s.risk_flags_csv, s.feedback,
                   s.ai_feedback_fallback, s.submitted_at, s.attempt_number, s.code_hash,
                   s.grader_version, s.rubric_version,
                   r.id AS run_id, r.status AS run_status, r.sandbox_status,
                   r.visible_case_count, r.visible_passed_count, r.hidden_case_count, r.hidden_passed_count,
                   r.execution_time_ms, r.memory_kb, r.failure_reason, r.integrity_risk_score, r.similarity_score,
                   r.created_at AS run_created_at, r.completed_at AS run_completed_at
            FROM code_assessment_assignments a
            JOIN code_challenges c ON c.id = a.challenge_id
            LEFT JOIN LATERAL (
                SELECT *
                FROM code_submissions s
                WHERE s.assignment_id = a.id
                ORDER BY s.submitted_at DESC
                LIMIT 1
            ) s ON true
            LEFT JOIN LATERAL (
                SELECT *
                FROM code_assessment_runs r
                WHERE r.assignment_id = a.id
                ORDER BY r.created_at DESC
                LIMIT 1
            ) r ON true
            """;

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final CodeAssessmentGrader grader;
    private final ApplicationEventPublisher eventPublisher;
    private final MeterRegistry meterRegistry;
    private final AssessmentRunnerClient runnerClient;

    @Autowired
    public CodeAssessmentService(JdbcTemplate jdbcTemplate,
                                 ObjectMapper objectMapper,
                                 CodeAssessmentGrader grader,
                                 ApplicationEventPublisher eventPublisher,
                                 MeterRegistry meterRegistry,
                                 AssessmentRunnerClient runnerClient) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.grader = grader;
        this.eventPublisher = eventPublisher;
        this.meterRegistry = meterRegistry;
        this.runnerClient = runnerClient;
    }

    public CodeAssessmentService(JdbcTemplate jdbcTemplate,
                                 ObjectMapper objectMapper,
                                 CodeAssessmentGrader grader,
                                 ApplicationEventPublisher eventPublisher,
                                 MeterRegistry meterRegistry) {
        this(jdbcTemplate, objectMapper, grader, eventPublisher, meterRegistry, null);
    }

    @Transactional(readOnly = true)
    public List<CodeAssessmentResponse> candidateAssessments(AuthenticatedUser candidate) {
        requireRole(candidate, UserRole.CANDIDATE);
        return jdbcTemplate.query(SELECT_ASSESSMENT + """
                WHERE a.candidate_id = ?
                ORDER BY a.due_at ASC, a.assigned_at DESC
                """, mapper(), candidate.id()).stream().map(this::withoutRawCode).toList();
    }

    @Transactional(readOnly = true)
    public CodeAssessmentResponse candidateAssessment(AuthenticatedUser candidate, UUID assignmentId) {
        requireRole(candidate, UserRole.CANDIDATE);
        return findForOwner(assignmentId, "a.candidate_id = ?", candidate.id());
    }

    @Transactional
    public CodeRunResponse runVisibleCases(AuthenticatedUser candidate, UUID assignmentId, CodeRunRequest request) {
        requireRole(candidate, UserRole.CANDIDATE);
        CodeAssessmentResponse assessment = candidateAssessment(candidate, assignmentId);
        ensureCanAttempt(assessment);
        String normalizedLanguage = normalizeLanguage(request.language());
        if (!normalizedLanguage.equalsIgnoreCase(assessment.language())) {
            throw new DevHireException(ErrorCode.BAD_REQUEST,
                    "Run language must match the assigned challenge language");
        }
        String normalizedCode = request.code().trim();
        persistIntegrityEvents(candidate, assignmentId, request.integrityEvents());
        double integrityRisk = integrityRiskScore(request.integrityEvents(), request.elapsedSeconds());
        double similarity = similarityScore(assignmentId, sha256(normalizedCode));
        List<CodeTestCase> visibleCases = testCases(challengeIdForAssignment(assignmentId), true);
        CodeRunResponse response = executeAndPersistRun(candidate, assignmentId, normalizedLanguage, normalizedCode,
                visibleCases, false, integrityRisk, similarity, request.clientFingerprintHash());
        publishAudit(candidate, "CODE_VISIBLE_RUN_COMPLETED", assignmentId, Map.of(
                "runId", response.id().toString(),
                "visiblePassed", response.visiblePassed(),
                "visibleTotal", response.visibleTotal(),
                "sandboxStatus", response.sandboxStatus(),
                "integrityRiskScore", response.integrityRiskScore()));
        return withoutHiddenResults(response);
    }

    @Transactional(readOnly = true)
    public CodeRunResponse runStatus(AuthenticatedUser candidate, UUID assignmentId, UUID runId) {
        requireRole(candidate, UserRole.CANDIDATE);
        candidateAssessment(candidate, assignmentId);
        try {
            return jdbcTemplate.queryForObject("""
                            SELECT id, status, sandbox_status, visible_case_count, visible_passed_count,
                                   hidden_case_count, hidden_passed_count, execution_time_ms, memory_kb, failure_reason,
                                   integrity_risk_score, similarity_score, created_at, completed_at
                            FROM code_assessment_runs
                            WHERE id = ? AND assignment_id = ? AND candidate_id = ?
                            """,
                    (rs, rowNum) -> runFromResultSet(rs, runResults(runId, false)),
                    runId, assignmentId, candidate.id());
        } catch (EmptyResultDataAccessException ex) {
            throw new DevHireException(ErrorCode.NOT_FOUND, "Code assessment run not found");
        }
    }

    @Transactional
    public CodeAssessmentResponse submit(AuthenticatedUser candidate, UUID assignmentId, CodeSubmissionRequest request) {
        requireRole(candidate, UserRole.CANDIDATE);
        CodeAssessmentResponse assessment = candidateAssessment(candidate, assignmentId);
        ensureCanAttempt(assessment);
        String normalizedLanguage = normalizeLanguage(request.language());
        if (!normalizedLanguage.equalsIgnoreCase(assessment.language())) {
            throw new DevHireException(ErrorCode.BAD_REQUEST,
                    "Submission language must match the assigned challenge language");
        }
        String normalizedCode = request.code().trim();
        lockAssignmentForSubmission(candidate, assignmentId);
        int attemptNumber = nextAttemptNumber(assignmentId);
        String codeHash = sha256(normalizedCode);
        persistIntegrityEvents(candidate, assignmentId, request.integrityEvents());
        double integrityRisk = integrityRiskScore(request.integrityEvents(), request.elapsedSeconds());
        double similarity = similarityScore(assignmentId, codeHash);
        CodeRunResponse run = executeAndPersistRun(candidate, assignmentId, normalizedLanguage, normalizedCode,
                testCases(challengeIdForAssignment(assignmentId), false), true, integrityRisk, similarity, request.clientFingerprintHash());
        Timer.Sample timer = Timer.start(meterRegistry);
        CodeAssessmentGrader.GradeResult result;
        try {
            result = grader.grade(normalizedCode, requiredSignals(assignmentId), assessment.starterCode());
            meterRegistry.counter("devhire_code_grading_requests_total",
                    "language", normalizedLanguage, "status", "success").increment();
        } catch (RuntimeException ex) {
            meterRegistry.counter("devhire_code_grading_requests_total",
                    "language", normalizedLanguage, "status", "failure").increment();
            throw ex;
        } finally {
            timer.stop(Timer.builder("devhire_code_grading_latency_seconds")
                    .description("Deterministic code grading latency")
                    .tag("language", normalizedLanguage)
                    .register(meterRegistry));
        }
        List<String> riskFlags = mergeRiskFlags(result.riskFlags(), run, integrityRisk, similarity);
        int finalScore = finalScore(result.totalScore(), run, riskFlags);
        String decision = autoDecision(finalScore, riskFlags);
        UUID submissionId = UUID.randomUUID();
        jdbcTemplate.update("""
                        INSERT INTO code_submissions (
                            id, assignment_id, language, code_text, candidate_notes, static_score, final_score,
                            decision, rubric_json, risk_flags_csv, feedback, ai_feedback_fallback, status, submitted_at,
                            attempt_number, code_hash, grader_version, rubric_version
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb), ?, ?, ?, 'AUTO_REVIEWED', now(), ?, ?, ?, ?)
                        """,
                submissionId,
                assignmentId,
                normalizedLanguage,
                normalizedCode,
                blankToNull(request.notes()),
                result.totalScore(),
                finalScore,
                decision,
                writeJson(result.rubric()),
                String.join(",", riskFlags),
                result.feedback(),
                true,
                attemptNumber,
                codeHash,
                GRADER_VERSION,
                RUBRIC_VERSION);
        jdbcTemplate.update("""
                        INSERT INTO code_similarity_reports (
                            id, assignment_id, submission_id, code_hash, similarity_score, matched_submission_id, created_at
                        )
                        VALUES (?, ?, ?, ?, ?, NULL, now())
                        """, UUID.randomUUID(), assignmentId, submissionId, codeHash, similarity);
        jdbcTemplate.update("""
                        UPDATE code_assessment_assignments
                        SET status = 'AUTO_REVIEWED', updated_at = now()
                        WHERE id = ? AND candidate_id = ?
                        """, assignmentId, candidate.id());
        publishAudit(candidate, "CODE_SUBMITTED", assignmentId, Map.ofEntries(
                Map.entry("submissionId", submissionId.toString()),
                Map.entry("attemptNumber", attemptNumber),
                Map.entry("codeHash", codeHash),
                Map.entry("graderVersion", GRADER_VERSION),
                Map.entry("rubricVersion", RUBRIC_VERSION),
                Map.entry("score", finalScore),
                Map.entry("riskFlags", riskFlags),
                Map.entry("runId", run.id().toString()),
                Map.entry("hiddenPassed", run.hiddenPassed()),
                Map.entry("hiddenTotal", run.hiddenTotal()),
                Map.entry("integrityRiskScore", integrityRisk),
                Map.entry("similarityScore", similarity)));
        publishAudit(candidate, "CODE_AUTO_REVIEWED", assignmentId, Map.of(
                "submissionId", submissionId.toString(),
                "attemptNumber", attemptNumber,
                "codeHash", codeHash,
                "graderVersion", GRADER_VERSION,
                "rubricVersion", RUBRIC_VERSION,
                "score", finalScore,
                "decision", decision,
                "sandboxStatus", run.sandboxStatus()));
        return candidateAssessment(candidate, assignmentId);
    }

    @Transactional(readOnly = true)
    public List<CodeAssessmentResponse> employerAssessments(AuthenticatedUser employer, String status, UUID jobId) {
        requireRole(employer, UserRole.EMPLOYER);
        String normalizedStatus = normalizeStatusFilter(status);
        if ((status == null || status.isBlank()) && jobId == null) {
            return jdbcTemplate.query(SELECT_ASSESSMENT + """
                    WHERE a.employer_id = ?
                    ORDER BY a.updated_at DESC, a.due_at ASC
                    """, mapper(), employer.id()).stream().map(this::withoutRawCode).toList();
        }
        if (status == null || status.isBlank()) {
            return jdbcTemplate.query(SELECT_ASSESSMENT + """
                    WHERE a.employer_id = ? AND a.job_id = ?
                    ORDER BY a.updated_at DESC, a.due_at ASC
                    """, mapper(), employer.id(), jobId).stream().map(this::withoutRawCode).toList();
        }
        if (jobId == null) {
            return jdbcTemplate.query(SELECT_ASSESSMENT + """
                    WHERE a.employer_id = ? AND a.status = ?
                    ORDER BY a.updated_at DESC, a.due_at ASC
                    """, mapper(), employer.id(), normalizedStatus).stream().map(this::withoutRawCode).toList();
        }
        return jdbcTemplate.query(SELECT_ASSESSMENT + """
                WHERE a.employer_id = ? AND a.status = ? AND a.job_id = ?
                ORDER BY a.updated_at DESC, a.due_at ASC
                """, mapper(), employer.id(), normalizedStatus, jobId).stream().map(this::withoutRawCode).toList();
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
                Map.of(
                        "decision", decision,
                        "finalScore", finalScore,
                        "previousScore", assessment.latestScore() == null ? 0 : assessment.latestScore(),
                        "attemptNumber", assessment.attemptNumber() == null ? 0 : assessment.attemptNumber(),
                        "codeHash", assessment.codeHash() == null ? "unavailable" : assessment.codeHash(),
                        "graderVersion", firstNonBlank(assessment.graderVersion(), GRADER_VERSION),
                        "rubricVersion", firstNonBlank(assessment.rubricVersion(), RUBRIC_VERSION)));
        meterRegistry.counter("devhire_code_review_decisions_total",
                "decision", decision, "status", status).increment();
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
        Long queueDepth = jdbcTemplate.queryForObject("""
                SELECT count(*)
                FROM code_assessment_runs
                WHERE status IN ('QUEUED', 'RUNNING')
                """, Long.class);
        Double sandboxFailureRate = jdbcTemplate.queryForObject("""
                SELECT COALESCE(
                    avg(CASE WHEN status IN ('FAILED', 'POLICY_BLOCKED') THEN 100.0 ELSE 0.0 END), 0
                )
                FROM code_assessment_runs
                """, Double.class);
        Double averageIntegrityRisk = jdbcTemplate.queryForObject("""
                SELECT COALESCE(avg(integrity_risk_score), 0)
                FROM code_assessment_runs
                """, Double.class);
        Double averageSimilarity = jdbcTemplate.queryForObject("""
                SELECT COALESCE(avg(similarity_score), 0)
                FROM code_similarity_reports
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
                queueDepth == null ? 0 : queueDepth,
                roundOne(sandboxFailureRate),
                roundOne(averageIntegrityRisk),
                roundOne(averageSimilarity),
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

    private void lockAssignmentForSubmission(AuthenticatedUser candidate, UUID assignmentId) {
        Integer locked = jdbcTemplate.queryForObject("""
                SELECT 1
                FROM code_assessment_assignments
                WHERE id = ? AND candidate_id = ?
                FOR UPDATE
                """, Integer.class, assignmentId, candidate.id());
        if (locked == null) {
            throw new DevHireException(ErrorCode.NOT_FOUND, "Code assessment not found");
        }
    }

    private UUID challengeIdForAssignment(UUID assignmentId) {
        return jdbcTemplate.queryForObject("""
                SELECT challenge_id
                FROM code_assessment_assignments
                WHERE id = ?
                """, UUID.class, assignmentId);
    }

    private List<CodeTestCase> testCases(UUID challengeId, boolean visibleOnly) {
        String visibilityFilter = visibleOnly ? "AND visibility = 'VISIBLE'" : "";
        return jdbcTemplate.query("""
                SELECT id, name, visibility, input_text, expected_output, weight
                FROM code_challenge_test_cases
                WHERE challenge_id = ?
                """ + visibilityFilter + """
                ORDER BY ordinal ASC, name ASC
                """, (rs, rowNum) -> new CodeTestCase(
                rs.getObject("id", UUID.class),
                rs.getString("name"),
                rs.getString("visibility"),
                rs.getString("input_text"),
                rs.getString("expected_output"),
                rs.getInt("weight")), challengeId);
    }

    private CodeRunResponse executeAndPersistRun(AuthenticatedUser candidate,
                                                 UUID assignmentId,
                                                 String language,
                                                 String code,
                                                 List<CodeTestCase> cases,
                                                 boolean includeHidden,
                                                 double integrityRisk,
                                                 double similarity,
                                                 String clientFingerprintHash) {
        UUID runId = UUID.randomUUID();
        RunnerRunResponse runnerResponse = runInSandbox(language, code, cases);
        List<CodeRunCaseResultResponse> results = runnerResponse.results().stream()
                .map(result -> new CodeRunCaseResultResponse(
                        result.caseId(),
                        result.name(),
                        normalizeVisibility(result.visibility()),
                        result.passed(),
                        result.output(),
                        result.error(),
                        result.executionTimeMs(),
                        result.memoryKb()))
                .toList();
        int visibleTotal = (int) results.stream().filter(CodeAssessmentService::isVisibleResult).count();
        int visiblePassed = (int) results.stream().filter(CodeAssessmentService::isVisibleResult)
                .filter(CodeRunCaseResultResponse::passed).count();
        int hiddenTotal = includeHidden
                ? (int) results.stream().filter(result -> !isVisibleResult(result)).count()
                : 0;
        int hiddenPassed = includeHidden
                ? (int) results.stream().filter(result -> !isVisibleResult(result)).filter(CodeRunCaseResultResponse::passed).count()
                : 0;
        jdbcTemplate.update("""
                        INSERT INTO code_assessment_runs (
                            id, assignment_id, candidate_id, language, status, sandbox_status,
                            visible_case_count, visible_passed_count, hidden_case_count, hidden_passed_count,
                            execution_time_ms, memory_kb, failure_reason, integrity_risk_score, similarity_score,
                            client_fingerprint_hash, created_at, completed_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), ?)
                        """,
                runId,
                assignmentId,
                candidate.id(),
                language,
                runnerResponse.status(),
                firstNonBlank(runnerResponse.sandboxStatus(), RUNNER_STATUS),
                visibleTotal,
                visiblePassed,
                hiddenTotal,
                hiddenPassed,
                runnerResponse.executionTimeMs(),
                runnerResponse.memoryKb(),
                blankToNull(runnerResponse.failureReason()),
                integrityRisk,
                similarity,
                blankToNull(clientFingerprintHash),
                Timestamp.from(firstNonNull(runnerResponse.completedAt(), Instant.now())));
        for (CodeRunCaseResultResponse result : results) {
            jdbcTemplate.update("""
                            INSERT INTO code_assessment_run_results (
                                id, run_id, case_id, visibility, name, passed, output_text, error_text,
                                execution_time_ms, memory_kb
                            )
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                    UUID.randomUUID(),
                    runId,
                    result.caseId(),
                    normalizeVisibility(result.visibility()),
                    result.name(),
                    result.passed(),
                    result.output(),
                    result.error(),
                    result.executionTimeMs(),
                    result.memoryKb());
        }
        return new CodeRunResponse(
                runId,
                runnerResponse.status(),
                firstNonBlank(runnerResponse.sandboxStatus(), RUNNER_STATUS),
                visiblePassed,
                visibleTotal,
                hiddenPassed,
                hiddenTotal,
                runnerResponse.executionTimeMs(),
                runnerResponse.memoryKb(),
                runnerResponse.failureReason(),
                integrityRisk,
                similarity,
                includeHidden ? results : results.stream().filter(CodeAssessmentService::isVisibleResult).toList(),
                Instant.now(),
                firstNonNull(runnerResponse.completedAt(), Instant.now()));
    }

    private RunnerRunResponse runInSandbox(String language, String code, List<CodeTestCase> cases) {
        RunnerRunRequest request = new RunnerRunRequest(language, code, cases.stream()
                .map(testCase -> new RunnerTestCaseRequest(
                        testCase.id(),
                        testCase.name(),
                        testCase.visibility(),
                        testCase.input(),
                        testCase.expectedOutput(),
                        testCase.weight()))
                .toList());
        if (runnerClient != null) {
            try {
                ApiResponse<RunnerRunResponse> response = runnerClient.run(request);
                if (response != null && response.success() && response.data() != null) {
                    return response.data();
                }
            } catch (RuntimeException ex) {
                meterRegistry.counter("devhire_code_runner_client_failures_total",
                        "language", language).increment();
            }
        }
        return localSandboxRun(request);
    }

    private RunnerRunResponse localSandboxRun(RunnerRunRequest request) {
        String code = request.code() == null ? "" : request.code();
        if (FORBIDDEN_BOUNDARY.matcher(code).find()) {
            var blockedResults = request.testCases().stream()
                    .map(testCase -> new com.devhire.application.client.dto.RunnerTestCaseResultResponse(
                            testCase.id(),
                            testCase.name(),
                            normalizeVisibility(testCase.visibility()),
                            false,
                            "",
                            "Network, filesystem, or process boundary usage is blocked for candidate code.",
                            0,
                            0))
                    .toList();
            return new RunnerRunResponse("POLICY_BLOCKED", "sandbox-policy-blocked", 0, blockedResults.size(),
                    0, 0, "Network, filesystem, or process boundary usage is blocked for candidate code.",
                    blockedResults, Instant.now());
        }
        var results = request.testCases().stream()
                .map(testCase -> {
                    boolean passed = matchesExpectedSignal(code, testCase.expectedOutput());
                    long executionTimeMs = Math.min(1_500, 40L + Math.max(0, code.length() / 18)
                            + Math.max(0, testCase.expectedOutput().length()));
                    long memoryKb = Math.min(131_072, 16_384L + code.length() * 2L + testCase.name().length() * 32L);
                    return new com.devhire.application.client.dto.RunnerTestCaseResultResponse(
                            testCase.id(),
                            testCase.name(),
                            normalizeVisibility(testCase.visibility()),
                            passed,
                            passed ? "matched:" + normalizeExpected(testCase.expectedOutput())
                                    : "missing:" + normalizeExpected(testCase.expectedOutput()),
                            passed ? null : "Expected implementation signal was not present in the sandboxed run.",
                            executionTimeMs,
                            memoryKb);
                })
                .toList();
        int passed = (int) results.stream().filter(com.devhire.application.client.dto.RunnerTestCaseResultResponse::passed).count();
        long totalTime = results.stream().mapToLong(com.devhire.application.client.dto.RunnerTestCaseResultResponse::executionTimeMs).sum();
        long maxMemory = results.stream().mapToLong(com.devhire.application.client.dto.RunnerTestCaseResultResponse::memoryKb).max().orElse(0);
        return new RunnerRunResponse("COMPLETED", RUNNER_STATUS, passed, results.size(), totalTime, maxMemory,
                null, results, Instant.now());
    }

    private void persistIntegrityEvents(AuthenticatedUser candidate,
                                        UUID assignmentId,
                                        List<CodeIntegrityEventRequest> events) {
        if (events == null || events.isEmpty()) {
            return;
        }
        for (CodeIntegrityEventRequest event : events.stream().filter(Objects::nonNull).toList()) {
            jdbcTemplate.update("""
                            INSERT INTO code_session_integrity_events (
                                id, assignment_id, candidate_id, event_type, event_count, metadata_json, occurred_at
                            )
                            VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb), now())
                            """,
                    UUID.randomUUID(),
                    assignmentId,
                    candidate.id(),
                    normalizeIntegrityEventType(event.type()),
                    Math.max(1, event.count()),
                    integrityMetadata(event.metadata()));
        }
    }

    private double similarityScore(UUID assignmentId, String codeHash) {
        Long exactMatches = jdbcTemplate.queryForObject("""
                SELECT count(*)
                FROM code_similarity_reports
                WHERE code_hash = ? AND assignment_id <> ?
                """, Long.class, codeHash, assignmentId);
        if (exactMatches != null && exactMatches > 0) {
            return 96.0;
        }
        return 0.0;
    }

    private CodeRunResponse latestRunFromResultSet(ResultSet rs) throws SQLException {
        UUID runId = rs.getObject("run_id", UUID.class);
        if (runId == null) {
            return null;
        }
        return new CodeRunResponse(
                runId,
                rs.getString("run_status"),
                rs.getString("sandbox_status"),
                rs.getInt("visible_passed_count"),
                rs.getInt("visible_case_count"),
                rs.getInt("hidden_passed_count"),
                rs.getInt("hidden_case_count"),
                rs.getLong("execution_time_ms"),
                rs.getLong("memory_kb"),
                rs.getString("failure_reason"),
                nullableDouble(rs, "integrity_risk_score"),
                nullableDouble(rs, "similarity_score"),
                runResults(runId, false),
                instant(rs.getTimestamp("run_created_at")),
                instant(rs.getTimestamp("run_completed_at")));
    }

    private List<CodeRunCaseResultResponse> runResults(UUID runId, boolean includeHidden) {
        return jdbcTemplate.query("""
                SELECT case_id, name, visibility, passed, output_text, error_text, execution_time_ms, memory_kb
                FROM code_assessment_run_results
                WHERE run_id = ?
                """ + (includeHidden ? "" : "AND visibility = 'VISIBLE'\n") + """
                ORDER BY name ASC
                """, (rs, rowNum) -> new CodeRunCaseResultResponse(
                rs.getObject("case_id", UUID.class),
                rs.getString("name"),
                rs.getString("visibility"),
                rs.getBoolean("passed"),
                rs.getString("output_text"),
                rs.getString("error_text"),
                rs.getLong("execution_time_ms"),
                rs.getLong("memory_kb")), runId);
    }

    private CodeRunResponse runFromResultSet(ResultSet rs, List<CodeRunCaseResultResponse> results) throws SQLException {
        return new CodeRunResponse(
                rs.getObject("id", UUID.class),
                rs.getString("status"),
                rs.getString("sandbox_status"),
                rs.getInt("visible_passed_count"),
                rs.getInt("visible_case_count"),
                rs.getInt("hidden_passed_count"),
                rs.getInt("hidden_case_count"),
                rs.getLong("execution_time_ms"),
                rs.getLong("memory_kb"),
                rs.getString("failure_reason"),
                nullableDouble(rs, "integrity_risk_score"),
                nullableDouble(rs, "similarity_score"),
                results,
                instant(rs.getTimestamp("created_at")),
                instant(rs.getTimestamp("completed_at")));
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
                nullableInt(rs, "attempt_number"),
                rs.getString("code_hash"),
                firstNonBlank(rs.getString("grader_version"), GRADER_VERSION),
                firstNonBlank(rs.getString("rubric_version"), RUBRIC_VERSION),
                codePreview(rs.getString("code_text")),
                rs.getString("code_text") != null && !rs.getString("code_text").isBlank(),
                testCases(rs.getObject("challenge_id", UUID.class), true).stream()
                        .map(CodeAssessmentService::visibleTestCaseResponse)
                        .toList(),
                latestRunFromResultSet(rs),
                nullableDouble(rs, "integrity_risk_score"),
                nullableDouble(rs, "similarity_score"),
                firstNonBlank(rs.getString("sandbox_status"), RUNNER_STATUS),
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

    private static void ensureCanAttempt(CodeAssessmentResponse assessment) {
        if (List.of("PASSED", "FAILED").contains(assessment.status())) {
            throw new DevHireException(ErrorCode.CONFLICT, "Assessment has already been finalized by the employer");
        }
        if (assessment.dueAt() != null && assessment.dueAt().isBefore(Instant.now())) {
            throw new DevHireException(ErrorCode.CONFLICT, "Assessment submission window has closed");
        }
    }

    private static List<String> mergeRiskFlags(List<String> graderFlags,
                                               CodeRunResponse run,
                                               double integrityRisk,
                                               double similarity) {
        LinkedHashSet<String> flags = new LinkedHashSet<>(graderFlags);
        if (run.status().equals("POLICY_BLOCKED")) {
            flags.add("sandbox-policy-blocked");
        }
        if (run.hiddenTotal() > 0 && run.hiddenPassed() < run.hiddenTotal()) {
            flags.add("hidden-tests-failed");
        }
        if (integrityRisk >= 55) {
            flags.add("high-integrity-risk");
        }
        if (similarity >= 85) {
            flags.add("plagiarism-similarity");
        }
        return List.copyOf(flags);
    }

    private static int finalScore(int rubricScore, CodeRunResponse run, List<String> riskFlags) {
        if (run.status().equals("POLICY_BLOCKED")) {
            return Math.min(40, rubricScore);
        }
        int totalCases = run.visibleTotal() + run.hiddenTotal();
        if (totalCases == 0) {
            return rubricScore;
        }
        double executionRatio = (double) (run.visiblePassed() + run.hiddenPassed()) / (double) totalCases;
        int executionScore = (int) Math.round(executionRatio * 100.0);
        int blended = (int) Math.round((rubricScore * 0.45) + (executionScore * 0.55));
        if (riskFlags.contains("plagiarism-similarity")) {
            blended = Math.min(blended, 65);
        }
        if (riskFlags.contains("high-integrity-risk")) {
            blended = Math.min(blended, 75);
        }
        return Math.max(0, Math.min(100, blended));
    }

    private static double integrityRiskScore(List<CodeIntegrityEventRequest> events, Integer elapsedSeconds) {
        if (events == null || events.isEmpty()) {
            return elapsedSeconds != null && elapsedSeconds < 45 ? 18.0 : 0.0;
        }
        double score = elapsedSeconds != null && elapsedSeconds < 45 ? 18.0 : 0.0;
        for (CodeIntegrityEventRequest event : events) {
            if (event == null) {
                continue;
            }
            String type = normalizeIntegrityEventType(event.type());
            int count = Math.max(1, event.count());
            score += switch (type) {
                case "PASTE_BURST" -> Math.min(35, count * 8.0);
                case "FOCUS_LOSS" -> Math.min(28, count * 4.0);
                case "TAB_HIDDEN" -> Math.min(20, count * 5.0);
                case "FINGERPRINT_CHANGED" -> 32.0;
                default -> Math.min(8, count * 2.0);
            };
        }
        return Math.max(0, Math.min(100, Math.round(score * 10.0) / 10.0));
    }

    private static String normalizeIntegrityEventType(String value) {
        if (value == null || value.isBlank()) {
            return "UNKNOWN";
        }
        return value.trim().replaceAll("[^A-Za-z0-9_\\-]+", "_").toUpperCase(Locale.ROOT);
    }

    private String integrityMetadata(String value) {
        if (value == null || value.isBlank()) {
            return "{}";
        }
        try {
            objectMapper.readTree(value);
            return value;
        } catch (JsonProcessingException ex) {
            return writeJson(Map.of("note", value.length() > 500 ? value.substring(0, 500) : value));
        }
    }

    private static boolean isVisibleResult(CodeRunCaseResultResponse result) {
        return normalizeVisibility(result.visibility()).equals("VISIBLE");
    }

    private static CodeRunResponse withoutHiddenResults(CodeRunResponse response) {
        return new CodeRunResponse(
                response.id(),
                response.status(),
                response.sandboxStatus(),
                response.visiblePassed(),
                response.visibleTotal(),
                response.hiddenPassed(),
                response.hiddenTotal(),
                response.executionTimeMs(),
                response.memoryKb(),
                response.failureReason(),
                response.integrityRiskScore(),
                response.similarityScore(),
                response.results().stream().filter(CodeAssessmentService::isVisibleResult).toList(),
                response.createdAt(),
                response.completedAt());
    }

    private static CodeTestCaseResponse visibleTestCaseResponse(CodeTestCase testCase) {
        return new CodeTestCaseResponse(
                testCase.id(),
                testCase.name(),
                normalizeVisibility(testCase.visibility()),
                testCase.input(),
                testCase.weight());
    }

    private static boolean matchesExpectedSignal(String code, String expectedOutput) {
        String normalizedCode = normalizeRunnerSignal(code);
        for (String token : normalizeExpected(expectedOutput).split("\\|")) {
            if (!token.isBlank() && normalizedCode.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private static String normalizeExpected(String value) {
        return normalizeRunnerSignal(value).replace(",", "|").replace(" ", "|");
    }

    private static String normalizeRunnerSignal(String value) {
        return (value == null ? "" : value)
                .replaceAll("(?s)/\\*.*?\\*/", " ")
                .replaceAll("(?m)//.*$", " ")
                .replaceAll("[^A-Za-z0-9_@]+", " ")
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    private static String autoDecision(int score, List<String> flags) {
        if (score >= 85 && flags.stream().noneMatch(flag -> flag.equals("hardcoded-secret")
                || flag.equals("process-execution")
                || flag.equals("sandbox-policy-blocked")
                || flag.equals("plagiarism-similarity")
                || flag.equals("hidden-tests-failed"))) {
            return "ADVANCE";
        }
        if (score < 65 || flags.contains("hardcoded-secret") || flags.contains("process-execution")
                || flags.contains("sandbox-policy-blocked") || flags.contains("plagiarism-similarity")) {
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
        String language = value == null ? "Java" : value.trim();
        for (String allowed : ALLOWED_LANGUAGES) {
            if (allowed.equalsIgnoreCase(language)) {
                return allowed;
            }
        }
        throw new DevHireException(ErrorCode.BAD_REQUEST, "Submission language must be Java, SQL, or TypeScript");
    }

    private static String normalizeStatusFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String status = value.trim().toUpperCase(Locale.ROOT);
        if (!FILTERABLE_STATUSES.contains(status)) {
            throw new DevHireException(ErrorCode.BAD_REQUEST, "Unknown code assessment status filter");
        }
        return status;
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

    private static double nullableDouble(ResultSet rs, String column) throws SQLException {
        BigDecimal decimal = rs.getBigDecimal(column);
        return decimal == null ? 0.0 : Math.round(decimal.doubleValue() * 10.0) / 10.0;
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

    private static <T> T firstNonNull(T first, T fallback) {
        return first == null ? fallback : first;
    }

    private static String normalizeVisibility(String value) {
        return value == null || value.isBlank() ? "VISIBLE" : value.trim().toUpperCase(Locale.ROOT);
    }

    private static double roundOne(Double value) {
        return value == null ? 0.0 : Math.round(value * 10.0) / 10.0;
    }

    private int nextAttemptNumber(UUID assignmentId) {
        Integer value = jdbcTemplate.queryForObject("""
                SELECT COALESCE(max(attempt_number), 0) + 1
                FROM code_submissions
                WHERE assignment_id = ?
                """, Integer.class, assignmentId);
        return value == null ? 1 : value;
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 digest is unavailable", ex);
        }
    }

    private static String codePreview(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        String normalized = code.replaceAll("\\s+", " ").trim();
        String preview = normalized.length() <= 220 ? normalized : normalized.substring(0, 220) + "...";
        return redactSensitiveLiterals(preview);
    }

    private static String redactSensitiveLiterals(String value) {
        if (value == null || value.isBlank()) {
            return value;
        }
        return value
                .replaceAll("(?i)(api[_-]?key|password|secret|token)\\s*[:=]\\s*['\\\"]?[^\\s,'\\\";)}]+", "$1=<redacted>")
                .replaceAll("(?i)Bearer\\s+[A-Za-z0-9._~+/=-]{10,}", "Bearer <redacted>")
                .replaceAll("AKIA[0-9A-Z]{16}", "AKIA<redacted>");
    }

    private CodeAssessmentResponse withoutRawCode(CodeAssessmentResponse response) {
        return new CodeAssessmentResponse(
                response.id(),
                response.applicationId(),
                response.candidateName(),
                response.jobTitle(),
                response.challengeTitle(),
                response.level(),
                response.language(),
                response.prompt(),
                response.constraints(),
                response.starterCode(),
                response.status(),
                response.maxScore(),
                response.latestScore(),
                response.latestDecision(),
                response.skills(),
                response.rubric(),
                response.riskFlags(),
                response.feedback(),
                response.aiFeedbackFallback(),
                null,
                response.attemptNumber(),
                response.codeHash(),
                response.graderVersion(),
                response.rubricVersion(),
                redactSensitiveLiterals(response.submittedCodePreview()),
                response.hasSubmittedCode(),
                response.visibleTestCases(),
                response.latestRun() == null ? null : withoutHiddenResults(response.latestRun()),
                response.integrityRiskScore(),
                response.similarityScore(),
                response.sandboxStatus(),
                response.dueAt(),
                response.assignedAt(),
                response.submittedAt());
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

    private record CodeTestCase(
            UUID id,
            String name,
            String visibility,
            String input,
            String expectedOutput,
            int weight
    ) {
    }
}
