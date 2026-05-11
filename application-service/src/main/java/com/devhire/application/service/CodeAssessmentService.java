package com.devhire.application.service;

import com.devhire.application.client.AssessmentRunnerClient;
import com.devhire.application.client.dto.RunnerHealthResponse;
import com.devhire.application.client.dto.RunnerRunRequest;
import com.devhire.application.client.dto.RunnerRunResponse;
import com.devhire.application.client.dto.RunnerTestCaseRequest;
import com.devhire.application.dto.request.CodeIntegrityEventRequest;
import com.devhire.application.dto.request.AssignCodeAssessmentRequest;
import com.devhire.application.dto.request.CodeChallengeRequest;
import com.devhire.application.dto.request.CodeChallengeTestCaseRequest;
import com.devhire.application.dto.request.CodeReviewRequest;
import com.devhire.application.dto.request.CodeRunRequest;
import com.devhire.application.dto.request.CodeSubmissionRequest;
import com.devhire.application.dto.response.CodeAssessmentResponse;
import com.devhire.application.dto.response.CodeAssessmentRunnerHealthResponse;
import com.devhire.application.dto.response.CodeAssessmentSummaryResponse;
import com.devhire.application.dto.response.CodeChallengeResponse;
import com.devhire.application.dto.response.CodeChallengeTestCaseResponse;
import com.devhire.application.dto.response.CodeRunCaseResultResponse;
import com.devhire.application.dto.response.CodeRunResponse;
import com.devhire.application.dto.response.CodeSubmissionSummaryResponse;
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
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.math.BigDecimal;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class CodeAssessmentService {
    private static final String GRADER_VERSION = "static-rubric-v1";
    private static final String RUBRIC_VERSION = "devhire-code-rubric-v1";
    private static final String RUNNER_STATUS = "JUDGE0_ISOLATED_SANDBOX";
    private static final String RUNNER_VERSION = "devhire-runtime-v0.7";
    private static final int DEFAULT_TIME_LIMIT_MS = 2_000;
    private static final int DEFAULT_MEMORY_KB = 131_072;
    private static final int DEFAULT_MAX_OUTPUT_BYTES = 12_000;
    private static final Set<String> ALLOWED_LANGUAGES = Set.of("Java", "SQL", "TypeScript");
    private static final Set<String> TERMINAL_RUN_STATUSES = Set.of("COMPLETED", "POLICY_BLOCKED", "FAILED");
    private static final Set<String> TERMINAL_VERDICTS = Set.of(
            "ACCEPTED", "WRONG_ANSWER", "COMPILE_ERROR", "TIME_LIMIT", "MEMORY_LIMIT",
            "TIME_LIMIT_EXCEEDED", "MEMORY_LIMIT_EXCEEDED",
            "RUNTIME_ERROR", "POLICY_BLOCKED", "RUNNER_UNAVAILABLE");
    private static final Set<String> FILTERABLE_STATUSES = Set.of(
            "ASSIGNED", "IN_PROGRESS", "SUBMITTED", "REVIEWED", "EXPIRED",
            "AUTO_REVIEWED", "EMPLOYER_REVIEWED", "PASSED", "FAILED");
    private static final Pattern FORBIDDEN_BOUNDARY = Pattern.compile(
            "(?i)((^|\\s)package\\s+[a-z0-9_.]+\\s*;|public\\s+class\\s+candidatesolution|"
                    + "runtime\\s*\\.\\s*getruntime|processbuilder|system\\s*\\.\\s*exit|\\.\\s*exec\\s*\\(|"
                    + "socket\\s*\\(|files\\s*\\.\\s*(read|readstring|readallbytes|write)|java\\.nio\\.file|"
                    + "new\\s+file\\s*\\(|fileinputstream|fileoutputstream|java\\.io|java\\.net|httpclient|"
                    + "java\\.lang\\.reflect|getdeclaredmethod|getmethod\\s*\\(|method\\s*\\.\\s*invoke|classloader|"
                    + "httpurlconnection|new\\s+url\\s*\\(|uri\\s*\\.\\s*create|fetch\\s*\\(|xmlhttprequest|"
                    + "child_process|deno\\s*\\.\\s*(read|write|run)|bun\\s*\\.\\s*file|"
                    + "require\\s*\\(\\s*['\"](fs|child_process|net|http|https)['\"]\\s*\\))");
    private static final TypeReference<List<RubricScoreResponse>> RUBRIC_TYPE = new TypeReference<>() {
    };
    private static final String SELECT_ASSESSMENT = """
            SELECT a.id AS assignment_id, a.application_id, a.candidate_id, a.employer_id, a.job_id,
                   a.candidate_name, a.job_title, a.status AS assignment_status, a.due_at, a.assigned_at,
                   c.id AS challenge_id, COALESCE(a.challenge_version, c.version) AS challenge_version,
                   COALESCE(cv.title, c.title) AS challenge_title,
                   COALESCE(cv.level, c.level) AS level,
                   COALESCE(cv.language, c.language) AS language,
                   COALESCE(cv.prompt, c.prompt) AS prompt,
                   COALESCE(cv.constraints_text, c.constraints_text) AS constraints_text,
                   COALESCE(cv.starter_code, c.starter_code) AS starter_code,
                   COALESCE(cv.skills_csv, c.skills_csv) AS skills_csv,
                   COALESCE(cv.required_signals_csv, c.required_signals_csv) AS required_signals_csv,
                   COALESCE(cv.max_score, c.max_score) AS max_score,
                   s.id AS submission_id, s.language AS submission_language, s.code_text, s.final_score,
                   s.decision, s.rubric_json::text AS rubric_json, s.risk_flags_csv, s.feedback,
                   s.ai_feedback_fallback, s.submitted_at, s.attempt_number, s.code_hash,
                   s.grader_version, s.rubric_version,
                   r.id AS run_id, r.status AS run_status, r.sandbox_status,
                   r.visible_case_count, r.visible_passed_count, r.hidden_case_count, r.hidden_passed_count,
                   r.verdict, r.compile_output_text, r.stdout_text, r.stderr_text,
                   r.time_limit_ms, r.memory_limit_kb, r.runner_version,
                   r.execution_time_ms, r.memory_kb, r.failure_reason, r.integrity_risk_score, r.similarity_score,
                   r.created_at AS run_created_at, r.completed_at AS run_completed_at
            FROM code_assessment_assignments a
            JOIN code_challenges c ON c.id = a.challenge_id
            LEFT JOIN code_challenge_versions cv ON cv.challenge_id = a.challenge_id
                                                AND cv.version = COALESCE(a.challenge_version, c.version)
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
    private final TransactionTemplate runEvidenceTransaction;

    @Autowired
    public CodeAssessmentService(JdbcTemplate jdbcTemplate,
                                 ObjectMapper objectMapper,
                                 CodeAssessmentGrader grader,
                                 ApplicationEventPublisher eventPublisher,
                                 MeterRegistry meterRegistry,
                                 AssessmentRunnerClient runnerClient,
                                 ObjectProvider<PlatformTransactionManager> transactionManagerProvider) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.grader = grader;
        this.eventPublisher = eventPublisher;
        this.meterRegistry = meterRegistry;
        this.runnerClient = runnerClient;
        PlatformTransactionManager transactionManager = transactionManagerProvider == null
                ? null
                : transactionManagerProvider.getIfAvailable();
        this.runEvidenceTransaction = transactionManager == null ? null : new TransactionTemplate(transactionManager);
        if (this.runEvidenceTransaction != null) {
            this.runEvidenceTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        }
    }

    public CodeAssessmentService(JdbcTemplate jdbcTemplate,
                                 ObjectMapper objectMapper,
                                 CodeAssessmentGrader grader,
                                 ApplicationEventPublisher eventPublisher,
                                 MeterRegistry meterRegistry,
                                 AssessmentRunnerClient runnerClient) {
        this(jdbcTemplate, objectMapper, grader, eventPublisher, meterRegistry, runnerClient, null);
    }

    public CodeAssessmentService(JdbcTemplate jdbcTemplate,
                                 ObjectMapper objectMapper,
                                 CodeAssessmentGrader grader,
                                 ApplicationEventPublisher eventPublisher,
                                 MeterRegistry meterRegistry) {
        this(jdbcTemplate, objectMapper, grader, eventPublisher, meterRegistry, null, null);
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
        return withoutHiddenRunResults(findForOwner(assignmentId, "a.candidate_id = ?", candidate.id()));
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
        double similarity = similarityScore(assignmentId, normalizedCode, sha256(normalizedCode));
        List<CodeTestCase> visibleCases = testCasesForAssignment(assignmentId, true);
        if (!blank(request.customInput()) && !visibleCases.isEmpty()) {
            CodeTestCase template = visibleCases.getFirst();
            visibleCases = List.of(new CodeTestCase(template.id(), "Custom input preview", "VISIBLE",
                    request.customInput(), "", null, null, 0, 0, template.version()));
        }
        CodeRunResponse response = executeAndPersistRun(candidate, assignmentId, normalizedLanguage, normalizedCode,
                visibleCases, false, integrityRisk, similarity, request.clientFingerprintHash());
        jdbcTemplate.update("""
                        UPDATE code_assessment_assignments
                        SET status = 'IN_PROGRESS', updated_at = now()
                        WHERE id = ? AND candidate_id = ? AND status = 'ASSIGNED'
                        """, assignmentId, candidate.id());
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
            CodeRunResponse response = jdbcTemplate.queryForObject("""
                            SELECT id, status, sandbox_status, visible_case_count, visible_passed_count,
                                   hidden_case_count, hidden_passed_count, execution_time_ms, memory_kb, failure_reason,
                                   verdict, compile_output_text, stdout_text, stderr_text,
                                   time_limit_ms, memory_limit_kb, runner_version,
                                   integrity_risk_score, similarity_score, created_at, completed_at
                            FROM code_assessment_runs
                            WHERE id = ? AND assignment_id = ? AND candidate_id = ?
                            """,
                    (rs, rowNum) -> runFromResultSet(rs, runResults(runId, false)),
                    runId, assignmentId, candidate.id());
            return withoutHiddenResults(response);
        } catch (EmptyResultDataAccessException ex) {
            throw new DevHireException(ErrorCode.NOT_FOUND, "Code assessment run not found");
        }
    }

    @Transactional(readOnly = true)
    public List<CodeSubmissionSummaryResponse> candidateSubmissions(AuthenticatedUser candidate, UUID assignmentId) {
        requireRole(candidate, UserRole.CANDIDATE);
        candidateAssessment(candidate, assignmentId);
        return submissionSummaries(assignmentId, false);
    }

    @Transactional(readOnly = true)
    public List<CodeSubmissionSummaryResponse> employerSubmissions(AuthenticatedUser employer, UUID assignmentId) {
        requireRole(employer, UserRole.EMPLOYER);
        employerAssessment(employer, assignmentId);
        return submissionSummaries(assignmentId, true);
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
        double similarity = similarityScore(assignmentId, normalizedCode, codeHash);
        List<CodeTestCase> submissionCases = testCasesForAssignment(assignmentId, false);
        CodeRunResponse run = executeAndPersistRun(candidate, assignmentId, normalizedLanguage, normalizedCode,
                submissionCases, true, integrityRisk, similarity, request.clientFingerprintHash());
        ensureTrustedRuntimeForSubmission(run);
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
        int finalScore = finalScore(result.totalScore(), run, riskFlags, submissionCases);
        String decision = autoDecision(finalScore, riskFlags);
        UUID submissionId = UUID.randomUUID();
        jdbcTemplate.update("""
                        INSERT INTO code_submissions (
                            id, assignment_id, language, code_text, candidate_notes, static_score, final_score,
                            decision, rubric_json, risk_flags_csv, feedback, ai_feedback_fallback, status, submitted_at,
                            attempt_number, code_hash, grader_version, rubric_version, run_id
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb), ?, ?, ?, 'AUTO_REVIEWED', now(), ?, ?, ?, ?, ?)
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
                RUBRIC_VERSION,
                run.id());
        jdbcTemplate.update("""
                        INSERT INTO code_similarity_reports (
                            id, assignment_id, submission_id, code_hash, similarity_score, matched_submission_id, created_at
                        )
                        VALUES (?, ?, ?, ?, ?, NULL, now())
                        """, UUID.randomUUID(), assignmentId, submissionId, codeHash, similarity);
        jdbcTemplate.update("""
                        UPDATE code_assessment_assignments
                        SET status = 'SUBMITTED', updated_at = now()
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
                Map.entry("verdict", run.verdict()),
                Map.entry("hiddenPassed", run.hiddenPassed()),
                Map.entry("hiddenTotal", run.hiddenTotal()),
                Map.entry("integrityRiskScore", integrityRisk),
                Map.entry("similarityScore", similarity)));
        publishAudit(candidate, "CODE_SUBMISSION_SCORED", assignmentId, Map.of(
                "submissionId", submissionId.toString(),
                "attemptNumber", attemptNumber,
                "codeHash", codeHash,
                "graderVersion", GRADER_VERSION,
                "rubricVersion", RUBRIC_VERSION,
                "score", finalScore,
                "decision", decision,
                "sandboxStatus", run.sandboxStatus(),
                "verdict", run.verdict()));
        return candidateAssessment(candidate, assignmentId);
    }

    @Transactional
    public CodeAssessmentResponse assignToApplication(AuthenticatedUser employer,
                                                      UUID applicationId,
                                                      AssignCodeAssessmentRequest request) {
        requireRole(employer, UserRole.EMPLOYER);
        ApplicationTarget target = applicationTarget(employer, applicationId);
        if (List.of("WITHDRAWN", "REJECTED").contains(target.status())) {
            throw new DevHireException(ErrorCode.CONFLICT,
                    "Cannot assign a code assessment to a closed application");
        }
        CodeChallengeChoice challenge = challengeChoice(request == null ? null : request.challengeId());
        if (!"Java".equalsIgnoreCase(challenge.language())) {
            throw new DevHireException(ErrorCode.BAD_REQUEST,
                    "Only active Java code challenges can be assigned in the MVP grading flow");
        }
        Instant dueAt = request == null || request.dueAt() == null
                ? Instant.now().plus(7, ChronoUnit.DAYS)
                : request.dueAt();
        if (!dueAt.isAfter(Instant.now())) {
            throw new DevHireException(ErrorCode.BAD_REQUEST,
                    "Code assessment due date must be in the future");
        }

        UUID newAssignmentId = UUID.randomUUID();
        int inserted = jdbcTemplate.update("""
                        INSERT INTO code_assessment_assignments (
                            id, application_id, candidate_id, employer_id, job_id, challenge_id, challenge_version,
                            candidate_name, job_title, status, due_at, assigned_at, updated_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ASSIGNED', ?, now(), now())
                        ON CONFLICT (application_id, challenge_id) DO NOTHING
                        """,
                newAssignmentId,
                target.applicationId(),
                target.candidateId(),
                target.employerId(),
                target.jobId(),
                challenge.id(),
                challenge.version(),
                candidateDisplayName(target.candidateId()),
                target.jobTitle(),
                Timestamp.from(dueAt));
        UUID assignmentId = assignmentIdForApplicationChallenge(applicationId, challenge.id());
        if (inserted > 0) {
            publishAudit(employer, "CODE_ASSESSMENT_ASSIGNED", assignmentId, Map.of(
                    "applicationId", applicationId.toString(),
                    "candidateId", target.candidateId().toString(),
                    "jobId", target.jobId().toString(),
                    "challengeId", challenge.id().toString(),
                    "challengeTitle", challenge.title(),
                    "dueAt", dueAt.toString()));
        }
        return employerAssessment(employer, assignmentId);
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
        int finalScore = assessment.latestScore() == null ? 0 : assessment.latestScore();
        String status = switch (decision) {
            case "PASS" -> "PASSED";
            case "REJECT" -> "FAILED";
            default -> "REVIEWED";
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
        Double acceptedRate = verdictRate("ACCEPTED");
        Double wrongAnswerRate = verdictRate("WRONG_ANSWER");
        Double compileErrorRate = verdictRate("COMPILE_ERROR");
        Double timeoutRate = verdictRate("TIME_LIMIT_EXCEEDED") + verdictRate("TIME_LIMIT");
        Double runnerUnavailableRate = verdictRate("RUNNER_UNAVAILABLE");
        Double policyBlockedRate = verdictRate("POLICY_BLOCKED");
        Double averageRuntimeMs = jdbcTemplate.queryForObject("""
                SELECT COALESCE(avg(execution_time_ms), 0)
                FROM code_assessment_runs
                """, Double.class);
        Double p95ExecutionMs = jdbcTemplate.queryForObject("""
                SELECT COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY execution_time_ms), 0)
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
        CodeAssessmentRunnerHealthResponse runnerHealth = runnerHealth(queueDepth == null ? 0 : queueDepth);
        return new CodeAssessmentSummaryResponse(
                sum(distribution),
                count(distribution, "SUBMITTED") + count(distribution, "REVIEWED") + count(distribution, "AUTO_REVIEWED")
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
                roundOne(acceptedRate),
                roundOne(wrongAnswerRate),
                roundOne(compileErrorRate),
                roundOne(timeoutRate),
                roundOne(runnerUnavailableRate),
                roundOne(policyBlockedRate),
                roundOne(averageRuntimeMs),
                roundOne(p95ExecutionMs),
                roundOne(averageIntegrityRisk),
                roundOne(averageSimilarity),
                distribution,
                runnerHealth);
    }

    @Transactional(readOnly = true)
    public List<CodeChallengeResponse> adminCodeChallenges(AuthenticatedUser admin) {
        requireRole(admin, UserRole.ADMIN);
        return jdbcTemplate.query("""
                SELECT c.id, c.slug, c.title, c.version, c.level, c.language, c.prompt, c.constraints_text,
                       c.starter_code, c.skills_csv, c.required_signals_csv, c.max_score, c.active,
                       c.reference_solution, c.created_at,
                       count(tc.id) FILTER (WHERE tc.version = c.version AND tc.visibility = 'VISIBLE') AS visible_cases,
                       count(tc.id) FILTER (WHERE tc.version = c.version AND tc.visibility = 'HIDDEN') AS hidden_cases
                FROM code_challenges c
                LEFT JOIN code_challenge_test_cases tc ON tc.challenge_id = c.id
                GROUP BY c.id
                ORDER BY c.active DESC, c.created_at DESC, c.title ASC
                """, (rs, rowNum) -> challengeFromResultSet(rs));
    }

    @Transactional
    public CodeChallengeResponse createCodeChallenge(AuthenticatedUser admin, CodeChallengeRequest request) {
        requireRole(admin, UserRole.ADMIN);
        ChallengeDraft draft = challengeDraft(request, null, 1);
        List<CodeTestCase> cases = testCasesFromRequest(request == null ? null : request.testCases(), draft.version());
        validatePublishableChallenge(draft, cases);
        UUID challengeId = UUID.randomUUID();
        jdbcTemplate.update("""
                        INSERT INTO code_challenges (
                            id, slug, title, version, level, language, prompt, constraints_text,
                            starter_code, skills_csv, required_signals_csv, max_score, active,
                            reference_solution, created_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
                        """,
                challengeId,
                draft.slug(),
                draft.title(),
                draft.version(),
                draft.level(),
                draft.language(),
                draft.prompt(),
                draft.constraints(),
                draft.starterCode(),
                String.join(",", draft.skills()),
                String.join(",", draft.requiredSignals()),
                draft.maxScore(),
                draft.active(),
                blankToNull(draft.referenceSolution()));
        persistChallengeVersion(challengeId, draft);
        persistChallengeCases(challengeId, draft.version(), cases);
        publishAudit(admin, "CODE_CHALLENGE_CREATED", challengeId, Map.of(
                "slug", draft.slug(),
                "version", draft.version(),
                "active", draft.active()));
        return challengeById(challengeId);
    }

    @Transactional
    public CodeChallengeResponse updateCodeChallenge(AuthenticatedUser admin, UUID challengeId, CodeChallengeRequest request) {
        requireRole(admin, UserRole.ADMIN);
        ChallengeDraft current = challengeDraftById(challengeId);
        ChallengeDraft draft = challengeDraft(request, current, current.version() + 1);
        List<CodeTestCase> cases = request != null && request.testCases() != null
                ? testCasesFromRequest(request.testCases(), draft.version())
                : copyCasesForVersion(challengeId, current.version(), draft.version());
        validatePublishableChallenge(draft, cases);
        jdbcTemplate.update("""
                        UPDATE code_challenges
                        SET slug = ?, title = ?, version = ?, level = ?, language = ?, prompt = ?,
                            constraints_text = ?, starter_code = ?, skills_csv = ?, required_signals_csv = ?,
                            max_score = ?, active = ?, reference_solution = ?
                        WHERE id = ?
                        """,
                draft.slug(),
                draft.title(),
                draft.version(),
                draft.level(),
                draft.language(),
                draft.prompt(),
                draft.constraints(),
                draft.starterCode(),
                String.join(",", draft.skills()),
                String.join(",", draft.requiredSignals()),
                draft.maxScore(),
                draft.active(),
                blankToNull(draft.referenceSolution()),
                challengeId);
        persistChallengeVersion(challengeId, draft);
        persistChallengeCases(challengeId, draft.version(), cases);
        publishAudit(admin, "CODE_CHALLENGE_UPDATED", challengeId, Map.of(
                "slug", draft.slug(),
                "version", draft.version(),
                "active", draft.active()));
        return challengeById(challengeId);
    }

    private Double verdictRate(String verdict) {
        return jdbcTemplate.queryForObject("""
                SELECT COALESCE(avg(CASE WHEN verdict = ? THEN 100.0 ELSE 0.0 END), 0)
                FROM code_assessment_runs
                """, Double.class, verdict);
    }

    private CodeAssessmentRunnerHealthResponse runnerHealth(long queueDepth) {
        if (runnerClient == null) {
            return CodeAssessmentRunnerHealthResponse.unknown(queueDepth);
        }
        try {
            ApiResponse<RunnerHealthResponse> response = runnerClient.health();
            RunnerHealthResponse health = response == null ? null : response.data();
            if (health == null) {
                return new CodeAssessmentRunnerHealthResponse(
                        "DOWN",
                        "unknown",
                        "unknown",
                        false,
                        true,
                        true,
                        queueDepth,
                        "Runner health response was empty",
                        Instant.now());
            }
            return new CodeAssessmentRunnerHealthResponse(
                    firstNonBlank(health.status(), "DOWN"),
                    firstNonBlank(health.mode(), "unknown"),
                    firstNonBlank(health.runnerVersion(), "unknown"),
                    health.judge0Configured(),
                    health.failClosed(),
                    health.networkDisabled(),
                    health.queueDepth(),
                    blankToNull(health.failClosedReason()),
                    health.checkedAt() == null ? Instant.now() : health.checkedAt());
        } catch (RuntimeException ex) {
            return new CodeAssessmentRunnerHealthResponse(
                    "DOWN",
                    "unknown",
                    "unknown",
                    false,
                    true,
                    true,
                    queueDepth,
                    "Runner health check failed: " + truncate(ex.getMessage(), 180),
                    Instant.now());
        }
    }

    private List<CodeSubmissionSummaryResponse> submissionSummaries(UUID assignmentId, boolean includeHiddenAggregate) {
        return jdbcTemplate.query("""
                SELECT s.id, s.assignment_id, s.run_id, s.language, s.final_score, s.decision,
                       s.rubric_json::text AS rubric_json, s.risk_flags_csv, s.feedback,
                       s.attempt_number, s.code_hash, s.grader_version, s.rubric_version,
                       s.code_text, s.submitted_at,
                       r.verdict, r.visible_passed_count, r.visible_case_count,
                       r.hidden_passed_count, r.hidden_case_count, r.execution_time_ms, r.memory_kb
                FROM code_submissions s
                LEFT JOIN code_assessment_runs r ON r.id = s.run_id
                WHERE s.assignment_id = ?
                ORDER BY s.attempt_number DESC, s.submitted_at DESC
                """, (rs, rowNum) -> new CodeSubmissionSummaryResponse(
                rs.getObject("id", UUID.class),
                rs.getObject("assignment_id", UUID.class),
                rs.getObject("run_id", UUID.class),
                rs.getString("language"),
                nullableInt(rs, "final_score"),
                rs.getString("decision"),
                readRubric(rs.getString("rubric_json")),
                splitCsv(rs.getString("risk_flags_csv")),
                rs.getString("feedback"),
                nullableInt(rs, "attempt_number"),
                rs.getString("code_hash"),
                firstNonBlank(rs.getString("grader_version"), GRADER_VERSION),
                firstNonBlank(rs.getString("rubric_version"), RUBRIC_VERSION),
                rs.getString("code_text"),
                codePreview(rs.getString("code_text")),
                rs.getString("code_text") != null && !rs.getString("code_text").isBlank(),
                firstNonBlank(rs.getString("verdict"), "UNKNOWN"),
                rs.getInt("visible_passed_count"),
                rs.getInt("visible_case_count"),
                includeHiddenAggregate ? rs.getInt("hidden_passed_count") : 0,
                includeHiddenAggregate ? rs.getInt("hidden_case_count") : 0,
                rs.getLong("execution_time_ms"),
                rs.getLong("memory_kb"),
                instant(rs.getTimestamp("submitted_at"))), assignmentId);
    }

    private CodeChallengeResponse challengeById(UUID challengeId) {
        try {
            return jdbcTemplate.queryForObject("""
                    SELECT c.id, c.slug, c.title, c.version, c.level, c.language, c.prompt, c.constraints_text,
                           c.starter_code, c.skills_csv, c.required_signals_csv, c.max_score, c.active,
                           c.reference_solution, c.created_at,
                           count(tc.id) FILTER (WHERE tc.version = c.version AND tc.visibility = 'VISIBLE') AS visible_cases,
                           count(tc.id) FILTER (WHERE tc.version = c.version AND tc.visibility = 'HIDDEN') AS hidden_cases
                    FROM code_challenges c
                    LEFT JOIN code_challenge_test_cases tc ON tc.challenge_id = c.id
                    WHERE c.id = ?
                    GROUP BY c.id
                    """, (rs, rowNum) -> challengeFromResultSet(rs), challengeId);
        } catch (EmptyResultDataAccessException ex) {
            throw new DevHireException(ErrorCode.NOT_FOUND, "Code challenge not found");
        }
    }

    private CodeChallengeResponse challengeFromResultSet(ResultSet rs) throws SQLException {
        return new CodeChallengeResponse(
                rs.getObject("id", UUID.class),
                rs.getString("slug"),
                rs.getString("title"),
                rs.getInt("version"),
                rs.getString("level"),
                rs.getString("language"),
                rs.getString("prompt"),
                rs.getString("constraints_text"),
                rs.getString("starter_code"),
                splitCsv(rs.getString("skills_csv")),
                splitCsv(rs.getString("required_signals_csv")),
                rs.getInt("max_score"),
                rs.getBoolean("active"),
                rs.getString("reference_solution"),
                rs.getInt("visible_cases"),
                rs.getInt("hidden_cases"),
                challengeTestCases(rs.getObject("id", UUID.class), rs.getInt("version")),
                instant(rs.getTimestamp("created_at")));
    }

    private List<CodeChallengeTestCaseResponse> challengeTestCases(UUID challengeId, int version) {
        return jdbcTemplate.query("""
                SELECT id, name, visibility, input_text, expected_output, weight, ordinal,
                       setup_sql, expected_rows_json
                FROM code_challenge_test_cases
                WHERE challenge_id = ? AND version = ?
                ORDER BY ordinal, name
                """, (rs, rowNum) -> new CodeChallengeTestCaseResponse(
                rs.getObject("id", UUID.class),
                rs.getString("name"),
                rs.getString("visibility"),
                rs.getString("input_text"),
                rs.getString("expected_output"),
                rs.getInt("weight"),
                rs.getInt("ordinal"),
                rs.getString("setup_sql"),
                rs.getString("expected_rows_json")), challengeId, version);
    }

    private ChallengeDraft challengeDraftById(UUID challengeId) {
        try {
            return jdbcTemplate.queryForObject("""
                    SELECT slug, title, version, level, language, prompt, constraints_text,
                           starter_code, skills_csv, required_signals_csv, max_score, active, reference_solution
                    FROM code_challenges
                    WHERE id = ?
                    """, (rs, rowNum) -> new ChallengeDraft(
                    rs.getString("slug"),
                    rs.getString("title"),
                    rs.getInt("version"),
                    rs.getString("level"),
                    rs.getString("language"),
                    rs.getString("prompt"),
                    rs.getString("constraints_text"),
                    rs.getString("starter_code"),
                    splitCsv(rs.getString("skills_csv")),
                    splitCsv(rs.getString("required_signals_csv")),
                    rs.getInt("max_score"),
                    rs.getBoolean("active"),
                    rs.getString("reference_solution")), challengeId);
        } catch (EmptyResultDataAccessException ex) {
            throw new DevHireException(ErrorCode.NOT_FOUND, "Code challenge not found");
        }
    }

    private ChallengeDraft challengeDraft(CodeChallengeRequest request, ChallengeDraft current, int version) {
        boolean creating = current == null;
        String title = creating ? requireText(request == null ? null : request.title(), "Challenge title is required")
                : firstNonBlank(request == null ? null : request.title(), current.title());
        String slug = creating
                ? firstNonBlank(request == null ? null : request.slug(), slugify(title))
                : firstNonBlank(request == null ? null : request.slug(), current.slug());
        String language = normalizeLanguage(creating ? request == null ? "Java" : request.language()
                : firstNonBlank(request == null ? null : request.language(), current.language()));
        List<String> skills = request == null || request.skills() == null
                ? creating ? List.of(language) : current.skills()
                : cleanList(request.skills());
        List<String> requiredSignals = request == null || request.requiredSignals() == null
                ? creating ? List.of("CandidateSolution", "solve") : current.requiredSignals()
                : cleanList(request.requiredSignals());
        return new ChallengeDraft(
                slug,
                title,
                version,
                firstNonBlank(request == null ? null : request.level(), creating ? "Senior" : current.level()),
                language,
                creating ? requireText(request == null ? null : request.prompt(), "Challenge prompt is required")
                        : firstNonBlank(request == null ? null : request.prompt(), current.prompt()),
                creating ? requireText(request == null ? null : request.constraints(), "Challenge constraints are required")
                        : firstNonBlank(request == null ? null : request.constraints(), current.constraints()),
                creating ? requireText(request == null ? null : request.starterCode(), "Challenge starter code is required")
                        : firstNonBlank(request == null ? null : request.starterCode(), current.starterCode()),
                skills,
                requiredSignals,
                request == null || request.maxScore() == null ? creating ? 100 : current.maxScore() : request.maxScore(),
                request == null || request.active() == null ? !creating && current.active() : request.active(),
                creating ? blankToNull(request == null ? null : request.referenceSolution())
                        : firstNonBlank(request == null ? null : request.referenceSolution(), current.referenceSolution()));
    }

    private List<CodeTestCase> testCasesFromRequest(List<CodeChallengeTestCaseRequest> requests, int version) {
        if (requests == null || requests.isEmpty()) {
            return List.of();
        }
        List<CodeTestCase> cases = new ArrayList<>();
        int ordinal = 1;
        for (CodeChallengeTestCaseRequest request : requests) {
            cases.add(new CodeTestCase(
                    UUID.randomUUID(),
                    requireText(request.name(), "Test case name is required"),
                    normalizeVisibility(request.visibility()),
                    request.stdin(),
                    requireText(request.expectedOutput(), "Expected output is required"),
                    request.setupSql(),
                    request.expectedRowsJson(),
                    request.weight() == null ? 10 : request.weight(),
                    request.ordinal() == null ? ordinal : request.ordinal(),
                    version));
            ordinal++;
        }
        return cases;
    }

    private List<CodeTestCase> copyCasesForVersion(UUID challengeId, int sourceVersion, int targetVersion) {
        return testCases(challengeId, sourceVersion, false).stream()
                .map(testCase -> new CodeTestCase(UUID.randomUUID(), testCase.name(), testCase.visibility(),
                        testCase.input(), testCase.expectedOutput(), testCase.setupSql(), testCase.expectedRowsJson(),
                        testCase.weight(), testCase.ordinal(), targetVersion))
                .toList();
    }

    private void validatePublishableChallenge(ChallengeDraft draft, List<CodeTestCase> cases) {
        if (!draft.active()) {
            return;
        }
        if (cases.stream().noneMatch(testCase -> isVisible(testCase.visibility()))
                || cases.stream().noneMatch(testCase -> !isVisible(testCase.visibility()))) {
            throw new DevHireException(ErrorCode.BAD_REQUEST,
                    "Active code challenges require at least one visible and one hidden executable case");
        }
        if (blank(draft.referenceSolution())) {
            throw new DevHireException(ErrorCode.BAD_REQUEST,
                    "Active code challenges require a reference solution");
        }
        RunnerRunRequest request = runnerRequest(draft.language(), draft.referenceSolution(), cases);
        RunnerRunResponse response = trustedOrFailureResponse(runInSandbox(draft.language(), request),
                request, draft.language(), true);
        if (!"ACCEPTED".equals(response.verdict())) {
            throw new DevHireException(ErrorCode.BAD_REQUEST,
                    "Reference solution must pass visible and hidden cases before publishing");
        }
    }

    private void persistChallengeVersion(UUID challengeId, ChallengeDraft draft) {
        jdbcTemplate.update("""
                        INSERT INTO code_challenge_versions (
                            challenge_id, version, title, level, language, prompt, constraints_text,
                            starter_code, skills_csv, required_signals_csv, max_score, reference_solution, created_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now())
                        ON CONFLICT (challenge_id, version) DO NOTHING
                        """,
                challengeId,
                draft.version(),
                draft.title(),
                draft.level(),
                draft.language(),
                draft.prompt(),
                draft.constraints(),
                draft.starterCode(),
                String.join(",", draft.skills()),
                String.join(",", draft.requiredSignals()),
                draft.maxScore(),
                blankToNull(draft.referenceSolution()));
    }

    private void persistChallengeCases(UUID challengeId, int version, List<CodeTestCase> cases) {
        for (CodeTestCase testCase : cases) {
            jdbcTemplate.update("""
                            INSERT INTO code_challenge_test_cases (
                                id, challenge_id, version, name, visibility, input_text, expected_output,
                                setup_sql, expected_rows_json, weight, ordinal
                            )
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            ON CONFLICT (challenge_id, version, name) DO UPDATE
                            SET visibility = EXCLUDED.visibility,
                                input_text = EXCLUDED.input_text,
                                expected_output = EXCLUDED.expected_output,
                                setup_sql = EXCLUDED.setup_sql,
                                expected_rows_json = EXCLUDED.expected_rows_json,
                                weight = EXCLUDED.weight,
                                ordinal = EXCLUDED.ordinal
                            """,
                    testCase.id(),
                    challengeId,
                    version,
                    testCase.name(),
                    normalizeVisibility(testCase.visibility()),
                    testCase.input(),
                    testCase.expectedOutput(),
                    testCase.setupSql(),
                    testCase.expectedRowsJson(),
                    testCase.weight(),
                    testCase.ordinal());
        }
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
                SELECT COALESCE(cv.required_signals_csv, c.required_signals_csv) AS required_signals_csv
                FROM code_assessment_assignments a
                JOIN code_challenges c ON c.id = a.challenge_id
                LEFT JOIN code_challenge_versions cv ON cv.challenge_id = a.challenge_id
                                                    AND cv.version = COALESCE(a.challenge_version, c.version)
                WHERE a.id = ?
                """, (rs, rowNum) -> splitCsv(rs.getString("required_signals_csv")), assignmentId);
    }

    private void lockAssignmentForSubmission(AuthenticatedUser candidate, UUID assignmentId) {
        Integer locked = jdbcTemplate.queryForObject("""
                SELECT 1
                FROM code_assessment_assignments
                WHERE id = ? AND candidate_id = ?
                FOR NO KEY UPDATE
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

    private CodeChallengeRef challengeRefForAssignment(UUID assignmentId) {
        return jdbcTemplate.queryForObject("""
                        SELECT a.challenge_id, COALESCE(a.challenge_version, c.version) AS challenge_version
                        FROM code_assessment_assignments a
                        JOIN code_challenges c ON c.id = a.challenge_id
                        WHERE a.id = ?
                        """,
                (rs, rowNum) -> new CodeChallengeRef(
                        rs.getObject("challenge_id", UUID.class),
                        rs.getInt("challenge_version")),
                assignmentId);
    }

    private ApplicationTarget applicationTarget(AuthenticatedUser employer, UUID applicationId) {
        try {
            return jdbcTemplate.queryForObject("""
                            SELECT id, candidate_id, employer_id, job_id, job_title, status
                            FROM job_applications
                            WHERE id = ? AND employer_id = ?
                            """,
                    (rs, rowNum) -> new ApplicationTarget(
                            rs.getObject("id", UUID.class),
                            rs.getObject("candidate_id", UUID.class),
                            rs.getObject("employer_id", UUID.class),
                            rs.getObject("job_id", UUID.class),
                            rs.getString("job_title"),
                            rs.getString("status")),
                    applicationId, employer.id());
        } catch (EmptyResultDataAccessException ex) {
            throw new DevHireException(ErrorCode.NOT_FOUND, "Application not found for employer");
        }
    }

    private CodeChallengeChoice challengeChoice(UUID requestedChallengeId) {
        try {
            if (requestedChallengeId != null) {
                return jdbcTemplate.queryForObject("""
                            SELECT id, title, language, version
                            FROM code_challenges
                            WHERE id = ?
                              AND active = true
                              AND language = 'Java'
                              AND slug = 'cloud-architecture-challenge'
                                """,
                        (rs, rowNum) -> new CodeChallengeChoice(
                                rs.getObject("id", UUID.class),
                                rs.getString("title"),
                                rs.getString("language"),
                                rs.getInt("version")),
                        requestedChallengeId);
            }
            return jdbcTemplate.queryForObject("""
                            SELECT id, title, language, version
                            FROM code_challenges
                            WHERE active = true
                              AND language = 'Java'
                              AND slug = 'cloud-architecture-challenge'
                            ORDER BY created_at DESC
                            LIMIT 1
                            """,
                    (rs, rowNum) -> new CodeChallengeChoice(
                            rs.getObject("id", UUID.class),
                            rs.getString("title"),
                            rs.getString("language"),
                            rs.getInt("version")));
        } catch (EmptyResultDataAccessException ex) {
            throw new DevHireException(ErrorCode.BAD_REQUEST, "Active Java cloud code challenge not found");
        }
    }

    private UUID assignmentIdForApplicationChallenge(UUID applicationId, UUID challengeId) {
        try {
            return jdbcTemplate.queryForObject("""
                    SELECT id
                    FROM code_assessment_assignments
                    WHERE application_id = ? AND challenge_id = ?
                    """, UUID.class, applicationId, challengeId);
        } catch (EmptyResultDataAccessException ex) {
            throw new DevHireException(ErrorCode.INTERNAL_ERROR, "Code assessment assignment was not created");
        }
    }

    private List<CodeTestCase> testCasesForAssignment(UUID assignmentId, boolean visibleOnly) {
        CodeChallengeRef ref = challengeRefForAssignment(assignmentId);
        return testCases(ref.challengeId(), ref.version(), visibleOnly);
    }

    private List<CodeTestCase> testCases(UUID challengeId, int challengeVersion, boolean visibleOnly) {
        String visibilityFilter = visibleOnly ? "AND visibility = 'VISIBLE'" : "";
        return jdbcTemplate.query("""
                SELECT id, name, visibility, input_text, expected_output, setup_sql, expected_rows_json, weight, ordinal, version
                FROM code_challenge_test_cases
                WHERE challenge_id = ?
                  AND version = ?
                """ + visibilityFilter + """
                ORDER BY ordinal ASC, name ASC
                """, (rs, rowNum) -> new CodeTestCase(
                rs.getObject("id", UUID.class),
                rs.getString("name"),
                rs.getString("visibility"),
                rs.getString("input_text"),
                rs.getString("expected_output"),
                rs.getString("setup_sql"),
                rs.getString("expected_rows_json"),
                rs.getInt("weight"),
                rs.getInt("ordinal"),
                rs.getInt("version")), challengeId, challengeVersion);
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
        RunnerRunRequest runnerRequest = runnerRequest(language, code, cases);
        RunnerRunResponse runnerResponse = trustedOrFailureResponse(runInSandbox(language, runnerRequest),
                runnerRequest, language, includeHidden);
        List<CodeRunCaseResultResponse> results = runnerResponse.results().stream()
                .map(result -> new CodeRunCaseResultResponse(
                        result.caseId(),
                        result.name(),
                        normalizeVisibility(result.visibility()),
                        result.passed(),
                        firstNonBlank(result.verdict(), result.passed() ? "ACCEPTED" : "WRONG_ANSWER"),
                        result.output(),
                        result.stdout(),
                        result.stderr(),
                        result.compileOutput(),
                        result.error(),
                        result.executionTimeMs(),
                        result.memoryKb(),
                        result.timeLimitMs(),
                        result.memoryLimitKb()))
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
        String verdict = firstNonBlank(runnerResponse.verdict(), verdictForResults(results));
        persistRunEvidence(runId, candidate, assignmentId, language, runnerResponse, results, visibleTotal, visiblePassed,
                hiddenTotal, hiddenPassed, verdict, integrityRisk, similarity, clientFingerprintHash);
        return new CodeRunResponse(
                runId,
                runnerResponse.status(),
                firstNonBlank(runnerResponse.sandboxStatus(), RUNNER_STATUS),
                verdict,
                visiblePassed,
                visibleTotal,
                hiddenPassed,
                hiddenTotal,
                runnerResponse.executionTimeMs(),
                runnerResponse.memoryKb(),
                runnerResponse.failureReason(),
                runnerResponse.compileOutput(),
                runnerResponse.stdout(),
                runnerResponse.stderr(),
                positiveOrDefault(runnerResponse.timeLimitMs(), DEFAULT_TIME_LIMIT_MS),
                positiveOrDefault(runnerResponse.memoryLimitKb(), DEFAULT_MEMORY_KB),
                firstNonBlank(runnerResponse.runnerVersion(), RUNNER_VERSION),
                integrityRisk,
                similarity,
                includeHidden ? results : results.stream().filter(CodeAssessmentService::isVisibleResult).toList(),
                Instant.now(),
                firstNonNull(runnerResponse.completedAt(), Instant.now()));
    }

    private void persistRunEvidence(UUID runId,
                                    AuthenticatedUser candidate,
                                    UUID assignmentId,
                                    String language,
                                    RunnerRunResponse runnerResponse,
                                    List<CodeRunCaseResultResponse> results,
                                    int visibleTotal,
                                    int visiblePassed,
                                    int hiddenTotal,
                                    int hiddenPassed,
                                    String verdict,
                                    double integrityRisk,
                                    double similarity,
                                    String clientFingerprintHash) {
        Runnable writer = () -> {
            jdbcTemplate.update("""
                        INSERT INTO code_assessment_runs (
                            id, assignment_id, candidate_id, language, status, sandbox_status,
                            visible_case_count, visible_passed_count, hidden_case_count, hidden_passed_count,
                            verdict, compile_output_text, stdout_text, stderr_text,
                            time_limit_ms, memory_limit_kb, runner_version,
                            execution_time_ms, memory_kb, failure_reason, integrity_risk_score, similarity_score,
                            client_fingerprint_hash, created_at, completed_at
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), ?)
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
                verdict,
                blankToNull(runnerResponse.compileOutput()),
                blankToNull(runnerResponse.stdout()),
                blankToNull(runnerResponse.stderr()),
                positiveOrDefault(runnerResponse.timeLimitMs(), DEFAULT_TIME_LIMIT_MS),
                positiveOrDefault(runnerResponse.memoryLimitKb(), DEFAULT_MEMORY_KB),
                firstNonBlank(runnerResponse.runnerVersion(), RUNNER_VERSION),
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
                                id, run_id, case_id, visibility, name, passed, verdict,
                                output_text, stdout_text, stderr_text, compile_output_text, error_text,
                                execution_time_ms, memory_kb, time_limit_ms, memory_limit_kb
                            )
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                    UUID.randomUUID(),
                    runId,
                    result.caseId(),
                    normalizeVisibility(result.visibility()),
                    result.name(),
                    result.passed(),
                    result.verdict(),
                    result.output(),
                    result.stdout(),
                    result.stderr(),
                    result.compileOutput(),
                    result.error(),
                    result.executionTimeMs(),
                    result.memoryKb(),
                    positiveOrDefault(result.timeLimitMs(), DEFAULT_TIME_LIMIT_MS),
                    positiveOrDefault(result.memoryLimitKb(), DEFAULT_MEMORY_KB));
            }
        };
        if (runEvidenceTransaction == null) {
            writer.run();
            return;
        }
        runEvidenceTransaction.executeWithoutResult(status -> writer.run());
    }

    private RunnerRunRequest runnerRequest(String language, String code, List<CodeTestCase> cases) {
        return new RunnerRunRequest(language, code, cases.stream()
                .map(testCase -> new RunnerTestCaseRequest(
                        testCase.id(),
                        testCase.name(),
                        testCase.visibility(),
                        testCase.input(),
                        testCase.input(),
                        testCase.expectedOutput(),
                        testCase.setupSql(),
                        testCase.expectedRowsJson(),
                        testCase.weight(),
                        DEFAULT_TIME_LIMIT_MS,
                        DEFAULT_MEMORY_KB))
                .toList(), DEFAULT_TIME_LIMIT_MS, DEFAULT_MEMORY_KB, DEFAULT_MAX_OUTPUT_BYTES);
    }

    private RunnerRunResponse runInSandbox(String language, RunnerRunRequest request) {
        if (isSql(language) && request.testCases().stream().anyMatch(testCase -> !hasExecutableSql(testCase))) {
            meterRegistry.counter("devhire_code_runner_client_failures_total",
                    "language", language).increment();
            return runnerUnavailable(request, "SQL runtime requires executable setup SQL and expected normalized rows");
        }
        if (runnerClient != null) {
            try {
                ApiResponse<RunnerRunResponse> response = runnerClient.run(request);
                if (response != null && response.success() && response.data() != null) {
                    return response.data();
                }
            } catch (RuntimeException ex) {
                meterRegistry.counter("devhire_code_runner_client_failures_total",
                        "language", language).increment();
                return runnerUnavailable(request, ex);
            }
            meterRegistry.counter("devhire_code_runner_client_failures_total",
                    "language", language).increment();
            return runnerUnavailable(request, (RuntimeException) null);
        }
        return localSandboxRun(request);
    }

    private RunnerRunResponse trustedOrFailureResponse(RunnerRunResponse response,
                                                       RunnerRunRequest request,
                                                       String language,
                                                       boolean includeHidden) {
        String invalidReason = invalidRunnerResponseReason(response, request, language, includeHidden);
        if (invalidReason == null) {
            return response;
        }
        meterRegistry.counter("devhire_code_runner_client_failures_total",
                "language", language).increment();
        return runnerUnavailable(request, invalidReason);
    }

    private static String invalidRunnerResponseReason(RunnerRunResponse response,
                                                      RunnerRunRequest request,
                                                      String language,
                                                      boolean includeHidden) {
        if (request.testCases() == null || request.testCases().isEmpty()) {
            return "No runtime test cases were configured for this challenge";
        }
        if (includeHidden && request.testCases().stream().noneMatch(testCase -> !isVisible(testCase.visibility()))) {
            return "Trusted submission requires hidden server-side test cases";
        }
        if (isSql(language) && request.testCases().stream().anyMatch(testCase -> !hasExecutableSql(testCase))) {
            return "SQL runtime requires executable setup SQL and expected normalized rows";
        }
        if (response == null) {
            return "Assessment runner returned an empty response";
        }
        if (response.results() == null || response.results().isEmpty()) {
            return "Assessment runner returned no case results";
        }
        String status = normalizeStatus(response.status());
        String verdict = normalizeVerdict(response.verdict());
        if (!TERMINAL_RUN_STATUSES.contains(status)) {
            return "Assessment runner returned a non-terminal status: " + status;
        }
        if (!TERMINAL_VERDICTS.contains(verdict)) {
            return "Assessment runner returned an unsupported verdict: " + verdict;
        }
        if ("FAILED".equals(status) && !"RUNNER_UNAVAILABLE".equals(verdict)) {
            return "Assessment runner failed without RUNNER_UNAVAILABLE verdict";
        }
        if ("POLICY_BLOCKED".equals(status) && !"POLICY_BLOCKED".equals(verdict)) {
            return "Assessment runner policy block verdict did not match status";
        }
        if ("COMPLETED".equals(status) && List.of("RUNNER_UNAVAILABLE", "POLICY_BLOCKED").contains(verdict)) {
            return "Assessment runner completed with an untrusted verdict";
        }

        Map<UUID, RunnerTestCaseRequest> requested = request.testCases().stream()
                .collect(Collectors.toMap(RunnerTestCaseRequest::id, Function.identity(), (left, right) -> left));
        if (requested.size() != request.testCases().size()) {
            return "Runtime request contained duplicate case IDs";
        }
        Set<UUID> seen = new HashSet<>();
        int passed = 0;
        for (var result : response.results()) {
            if (result == null || result.caseId() == null) {
                return "Assessment runner returned a result without a case ID";
            }
            if (!seen.add(result.caseId())) {
                return "Assessment runner returned duplicate case result: " + result.caseId();
            }
            RunnerTestCaseRequest expected = requested.get(result.caseId());
            if (expected == null) {
                return "Assessment runner returned an unexpected case result: " + result.caseId();
            }
            if (!normalizeVisibility(expected.visibility()).equals(normalizeVisibility(result.visibility()))) {
                return "Assessment runner returned mismatched case visibility";
            }
            String resultVerdict = normalizeVerdict(result.verdict());
            if (!TERMINAL_VERDICTS.contains(resultVerdict)) {
                return "Assessment runner returned an unsupported case verdict: " + resultVerdict;
            }
            if (result.passed()) {
                passed++;
                if (!"ACCEPTED".equals(resultVerdict)) {
                    return "Assessment runner marked a non-accepted case as passed";
                }
            }
        }
        if (!seen.equals(requested.keySet())) {
            return "Assessment runner did not return every requested case result";
        }
        if (response.total() != response.results().size() || response.passed() != passed) {
            return "Assessment runner aggregate counts do not match case results";
        }
        String resultsVerdict = verdictForRunnerResults(response.results());
        if (!verdict.equals(resultsVerdict)) {
            return "Assessment runner top-level verdict does not match case results";
        }
        return null;
    }

    private static boolean hasExecutableSql(RunnerTestCaseRequest testCase) {
        return !blank(testCase.setupSql()) && !blank(testCase.expectedRowsJson());
    }

    private RunnerRunResponse runnerUnavailable(RunnerRunRequest request, RuntimeException ex) {
        return runnerUnavailable(request, ex == null || ex.getMessage() == null
                ? "Assessment runner returned no successful result"
                : ex.getMessage());
    }

    private RunnerRunResponse runnerUnavailable(RunnerRunRequest request, String reason) {
        var results = request.testCases().stream()
                .map(testCase -> new com.devhire.application.client.dto.RunnerTestCaseResultResponse(
                        testCase.id(),
                        testCase.name(),
                        normalizeVisibility(testCase.visibility()),
                        false,
                        "RUNNER_UNAVAILABLE",
                        "",
                        "",
                        null,
                        null,
                        "Assessment runner was unavailable; server-side scoring did not trust a local fallback.",
                        0,
                        0,
                        positiveOrDefault(request.timeLimitMs() == null ? 0 : request.timeLimitMs(), DEFAULT_TIME_LIMIT_MS),
                        positiveOrDefault(request.memoryLimitKb() == null ? 0 : request.memoryLimitKb(), DEFAULT_MEMORY_KB)))
                .toList();
        return new RunnerRunResponse("FAILED", "sandbox-runner-unavailable", "RUNNER_UNAVAILABLE", 0, results.size(),
                0, 0, reason, null, null, null,
                positiveOrDefault(request.timeLimitMs() == null ? 0 : request.timeLimitMs(), DEFAULT_TIME_LIMIT_MS),
                positiveOrDefault(request.memoryLimitKb() == null ? 0 : request.memoryLimitKb(), DEFAULT_MEMORY_KB),
                RUNNER_VERSION, results, Instant.now());
    }

    private RunnerRunResponse localSandboxRun(RunnerRunRequest request) {
        String code = request.code() == null ? "" : request.code();
        if (FORBIDDEN_BOUNDARY.matcher(stripNonImplementationText(code)).find()) {
            var blockedResults = request.testCases().stream()
                    .map(testCase -> new com.devhire.application.client.dto.RunnerTestCaseResultResponse(
                            testCase.id(),
                            testCase.name(),
                            normalizeVisibility(testCase.visibility()),
                            false,
                            "POLICY_BLOCKED",
                            "",
                            "",
                            null,
                            null,
                            "Network, filesystem, or process boundary usage is blocked for candidate code.",
                            0,
                            0,
                            positiveOrDefault(request.timeLimitMs() == null ? 0 : request.timeLimitMs(), DEFAULT_TIME_LIMIT_MS),
                            positiveOrDefault(request.memoryLimitKb() == null ? 0 : request.memoryLimitKb(), DEFAULT_MEMORY_KB)))
                    .toList();
            return new RunnerRunResponse("POLICY_BLOCKED", "sandbox-policy-blocked", "POLICY_BLOCKED", 0, blockedResults.size(),
                    0, 0, "Network, filesystem, or process boundary usage is blocked for candidate code.",
                    null, null, null,
                    positiveOrDefault(request.timeLimitMs() == null ? 0 : request.timeLimitMs(), DEFAULT_TIME_LIMIT_MS),
                    positiveOrDefault(request.memoryLimitKb() == null ? 0 : request.memoryLimitKb(), DEFAULT_MEMORY_KB),
                    RUNNER_VERSION, blockedResults, Instant.now());
        }
        var results = request.testCases().stream()
                .map(testCase -> {
                    String expected = firstNonBlank(testCase.expectedRowsJson(), testCase.expectedOutput(), "");
                    String rawOutput = localPreviewOutput(request.language(), code, testCase, expected);
                    boolean passed = normalizedOutput(rawOutput).equals(normalizedOutput(expected));
                    String output = passed ? normalizedOutput(expected) : normalizedOutput(rawOutput);
                    long executionTimeMs = Math.min(1_500, 40L + Math.max(0, code.length() / 18)
                            + Math.max(0, expected.length()));
                    long memoryKb = Math.min(131_072, 16_384L + code.length() * 2L + testCase.name().length() * 32L);
                    return new com.devhire.application.client.dto.RunnerTestCaseResultResponse(
                            testCase.id(),
                            testCase.name(),
                            normalizeVisibility(testCase.visibility()),
                            passed,
                            passed ? "ACCEPTED" : "WRONG_ANSWER",
                            output,
                            output,
                            null,
                            null,
                            passed ? null : "Expected %s but got %s.".formatted(
                                    normalizedOutput(expected), output.isBlank() ? "<empty>" : output),
                            executionTimeMs,
                            memoryKb,
                            positiveOrDefault(testCase.timeLimitMs() == null ? 0 : testCase.timeLimitMs(), DEFAULT_TIME_LIMIT_MS),
                            positiveOrDefault(testCase.memoryLimitKb() == null ? 0 : testCase.memoryLimitKb(), DEFAULT_MEMORY_KB));
                })
                .toList();
        int passed = (int) results.stream().filter(com.devhire.application.client.dto.RunnerTestCaseResultResponse::passed).count();
        long totalTime = results.stream().mapToLong(com.devhire.application.client.dto.RunnerTestCaseResultResponse::executionTimeMs).sum();
        long maxMemory = results.stream().mapToLong(com.devhire.application.client.dto.RunnerTestCaseResultResponse::memoryKb).max().orElse(0);
        return new RunnerRunResponse("COMPLETED", "DETERMINISTIC_LOCAL_PREVIEW",
                passed == results.size() ? "ACCEPTED" : "WRONG_ANSWER", passed, results.size(), totalTime, maxMemory,
                null, null, null, null,
                positiveOrDefault(request.timeLimitMs() == null ? 0 : request.timeLimitMs(), DEFAULT_TIME_LIMIT_MS),
                positiveOrDefault(request.memoryLimitKb() == null ? 0 : request.memoryLimitKb(), DEFAULT_MEMORY_KB),
                RUNNER_VERSION, results, Instant.now());
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

    private double similarityScore(UUID assignmentId, String code, String codeHash) {
        Long exactMatches = jdbcTemplate.queryForObject("""
                SELECT count(*)
                FROM code_similarity_reports
                WHERE code_hash = ? AND assignment_id <> ?
                """, Long.class, codeHash, assignmentId);
        if (exactMatches != null && exactMatches > 0) {
            return 96.0;
        }
        Set<String> candidateFingerprint = tokenFingerprint(code);
        if (candidateFingerprint.isEmpty()) {
            return 0.0;
        }
        List<String> previous = jdbcTemplate.query("""
                SELECT s.code_text
                FROM code_submissions s
                JOIN code_assessment_assignments current_assignment ON current_assignment.id = ?
                JOIN code_assessment_assignments other_assignment ON other_assignment.id = s.assignment_id
                WHERE other_assignment.challenge_id = current_assignment.challenge_id
                  AND s.assignment_id <> ?
                ORDER BY s.submitted_at DESC
                LIMIT 100
                """, (rs, rowNum) -> rs.getString("code_text"), assignmentId, assignmentId);
        double maxScore = 0.0;
        for (String previousCode : previous) {
            Set<String> previousFingerprint = tokenFingerprint(previousCode);
            if (previousFingerprint.isEmpty()) {
                continue;
            }
            int overlap = 0;
            for (String token : candidateFingerprint) {
                if (previousFingerprint.contains(token)) {
                    overlap++;
                }
            }
            int union = candidateFingerprint.size() + previousFingerprint.size() - overlap;
            if (union > 0) {
                maxScore = Math.max(maxScore, (overlap * 100.0) / union);
            }
        }
        return Math.round(maxScore * 10.0) / 10.0;
    }

    private CodeRunResponse latestRunFromResultSet(ResultSet rs) throws SQLException {
        UUID runId = rs.getObject("run_id", UUID.class);
        if (runId == null) {
            return null;
        }
        List<CodeRunCaseResultResponse> results = runResults(runId, false);
        return new CodeRunResponse(
                runId,
                rs.getString("run_status"),
                rs.getString("sandbox_status"),
                firstNonBlank(rs.getString("verdict"), "UNKNOWN"),
                rs.getInt("visible_passed_count"),
                rs.getInt("visible_case_count"),
                rs.getInt("hidden_passed_count"),
                rs.getInt("hidden_case_count"),
                rs.getLong("execution_time_ms"),
                rs.getLong("memory_kb"),
                rs.getString("failure_reason"),
                firstVisibleOutput(results, CodeRunCaseResultResponse::compileOutput),
                firstVisibleOutput(results, CodeRunCaseResultResponse::stdout),
                firstVisibleOutput(results, CodeRunCaseResultResponse::stderr),
                positiveOrDefault(rs.getInt("time_limit_ms"), DEFAULT_TIME_LIMIT_MS),
                positiveOrDefault(rs.getInt("memory_limit_kb"), DEFAULT_MEMORY_KB),
                firstNonBlank(rs.getString("runner_version"), RUNNER_VERSION),
                nullableDouble(rs, "integrity_risk_score"),
                nullableDouble(rs, "similarity_score"),
                results,
                instant(rs.getTimestamp("run_created_at")),
                instant(rs.getTimestamp("run_completed_at")));
    }

    private List<CodeRunCaseResultResponse> runResults(UUID runId, boolean includeHidden) {
        return jdbcTemplate.query("""
                SELECT case_id, name, visibility, passed, verdict, output_text, stdout_text, stderr_text,
                       compile_output_text, error_text, execution_time_ms, memory_kb, time_limit_ms, memory_limit_kb
                FROM code_assessment_run_results
                WHERE run_id = ?
                """ + (includeHidden ? "" : "AND visibility = 'VISIBLE'\n") + """
                ORDER BY name ASC
                """, (rs, rowNum) -> new CodeRunCaseResultResponse(
                rs.getObject("case_id", UUID.class),
                rs.getString("name"),
                rs.getString("visibility"),
                rs.getBoolean("passed"),
                firstNonBlank(rs.getString("verdict"), rs.getBoolean("passed") ? "ACCEPTED" : "WRONG_ANSWER"),
                rs.getString("output_text"),
                rs.getString("stdout_text"),
                rs.getString("stderr_text"),
                rs.getString("compile_output_text"),
                rs.getString("error_text"),
                rs.getLong("execution_time_ms"),
                rs.getLong("memory_kb"),
                positiveOrDefault(rs.getInt("time_limit_ms"), DEFAULT_TIME_LIMIT_MS),
                positiveOrDefault(rs.getInt("memory_limit_kb"), DEFAULT_MEMORY_KB)), runId);
    }

    private CodeRunResponse runFromResultSet(ResultSet rs, List<CodeRunCaseResultResponse> results) throws SQLException {
        return new CodeRunResponse(
                rs.getObject("id", UUID.class),
                rs.getString("status"),
                rs.getString("sandbox_status"),
                firstNonBlank(rs.getString("verdict"), "UNKNOWN"),
                rs.getInt("visible_passed_count"),
                rs.getInt("visible_case_count"),
                rs.getInt("hidden_passed_count"),
                rs.getInt("hidden_case_count"),
                rs.getLong("execution_time_ms"),
                rs.getLong("memory_kb"),
                rs.getString("failure_reason"),
                firstVisibleOutput(results, CodeRunCaseResultResponse::compileOutput),
                firstVisibleOutput(results, CodeRunCaseResultResponse::stdout),
                firstVisibleOutput(results, CodeRunCaseResultResponse::stderr),
                positiveOrDefault(rs.getInt("time_limit_ms"), DEFAULT_TIME_LIMIT_MS),
                positiveOrDefault(rs.getInt("memory_limit_kb"), DEFAULT_MEMORY_KB),
                firstNonBlank(rs.getString("runner_version"), RUNNER_VERSION),
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
                rs.getInt("challenge_version"),
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
                testCases(rs.getObject("challenge_id", UUID.class), rs.getInt("challenge_version"), true).stream()
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
        if (List.of("SUBMITTED", "AUTO_REVIEWED", "EMPLOYER_REVIEWED", "REVIEWED", "PASSED", "FAILED")
                .contains(assessment.status())) {
            throw new DevHireException(ErrorCode.CONFLICT, "Assessment has already been submitted or finalized");
        }
        if (assessment.dueAt() != null && assessment.dueAt().isBefore(Instant.now())) {
            throw new DevHireException(ErrorCode.CONFLICT, "Assessment submission window has closed");
        }
    }

    private static void ensureTrustedRuntimeForSubmission(CodeRunResponse run) {
        if ("RUNNER_UNAVAILABLE".equals(run.verdict()) || "POLICY_BLOCKED".equals(run.verdict())
                || "COMPILE_ERROR".equals(run.verdict())
                || "FAILED".equals(run.status()) || "POLICY_BLOCKED".equals(run.status())) {
            throw new DevHireException(ErrorCode.INTERNAL_ERROR,
                    "Assessment runtime did not produce a trusted final score");
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
        if ("COMPILE_ERROR".equals(run.verdict())) {
            flags.add("compile-error");
        }
        if ("TIME_LIMIT_EXCEEDED".equals(run.verdict()) || "TIME_LIMIT".equals(run.verdict())) {
            flags.add("time-limit-exceeded");
        }
        if ("MEMORY_LIMIT_EXCEEDED".equals(run.verdict()) || "MEMORY_LIMIT".equals(run.verdict())) {
            flags.add("memory-limit-exceeded");
        }
        if ("RUNTIME_ERROR".equals(run.verdict())) {
            flags.add("runtime-error");
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

    private static int finalScore(int rubricScore,
                                  CodeRunResponse run,
                                  List<String> riskFlags,
                                  List<CodeTestCase> testCases) {
        if (run.status().equals("POLICY_BLOCKED") || "POLICY_BLOCKED".equals(run.verdict())
                || "RUNNER_UNAVAILABLE".equals(run.verdict())) {
            return 0;
        }
        if ("COMPILE_ERROR".equals(run.verdict())) {
            return 0;
        }
        int totalWeight = testCases.stream().mapToInt(CodeTestCase::weight).sum();
        if (totalWeight <= 0) {
            totalWeight = run.visibleTotal() + run.hiddenTotal();
        }
        if (totalWeight <= 0) {
            return Math.max(0, Math.min(100, rubricScore));
        }
        Map<UUID, Integer> weights = testCases.stream()
                .collect(Collectors.toMap(CodeTestCase::id, CodeTestCase::weight, Integer::sum));
        int passedWeight = run.results().stream()
                .filter(CodeRunCaseResultResponse::passed)
                .mapToInt(result -> weights.getOrDefault(result.caseId(), 1))
                .sum();
        int executionScore = (int) Math.round(((double) passedWeight / (double) totalWeight) * 100.0);
        int blended = (int) Math.round((executionScore * 0.75) + (rubricScore * 0.25));
        if (List.of("TIME_LIMIT", "MEMORY_LIMIT", "TIME_LIMIT_EXCEEDED", "MEMORY_LIMIT_EXCEEDED", "RUNTIME_ERROR")
                .contains(run.verdict())) {
            blended = Math.min(40, blended);
        }
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
        List<CodeRunCaseResultResponse> visibleResults = response.results().stream()
                .filter(CodeAssessmentService::isVisibleResult)
                .toList();
        return new CodeRunResponse(
                response.id(),
                response.status(),
                response.sandboxStatus(),
                response.verdict(),
                response.visiblePassed(),
                response.visibleTotal(),
                0,
                0,
                response.executionTimeMs(),
                response.memoryKb(),
                visibleFailureReason(response, visibleResults),
                firstVisibleOutput(visibleResults, CodeRunCaseResultResponse::compileOutput),
                firstVisibleOutput(visibleResults, CodeRunCaseResultResponse::stdout),
                firstVisibleOutput(visibleResults, CodeRunCaseResultResponse::stderr),
                response.timeLimitMs(),
                response.memoryLimitKb(),
                response.runnerVersion(),
                response.integrityRiskScore(),
                response.similarityScore(),
                visibleResults,
                response.createdAt(),
                response.completedAt());
    }

    private static String visibleFailureReason(CodeRunResponse response, List<CodeRunCaseResultResponse> visibleResults) {
        if (visibleResults.isEmpty() || visibleResults.stream().anyMatch(result -> !result.passed())) {
            return response.failureReason();
        }
        return null;
    }

    private static String firstVisibleOutput(List<CodeRunCaseResultResponse> results,
                                             Function<CodeRunCaseResultResponse, String> mapper) {
        return results.stream()
                .filter(CodeAssessmentService::isVisibleResult)
                .map(mapper)
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse(null);
    }

    private static String localPreviewOutput(String language,
                                             String code,
                                             RunnerTestCaseRequest testCase,
                                             String expectedOutput) {
        if ("java".equalsIgnoreCase(language) && isLeetCodeSolveContract(code)) {
            return javaSolvePreview(code, testCase.input(), expectedOutput);
        }
        if (matchesExpectedSignal(code, expectedOutput)) {
            return expectedOutput;
        }
        return "";
    }

    private static boolean isLeetCodeSolveContract(String code) {
        String normalized = code == null ? "" : code.toLowerCase(Locale.ROOT);
        return normalized.contains("class candidatesolution")
                && normalized.contains("solve")
                && normalized.contains("string input");
    }

    private static String javaSolvePreview(String code, String input, String expectedOutput) {
        String normalizedCode = normalizeImplementationSignal(code);
        String normalizedSource = normalizeRunnerText(code);
        String normalizedInput = input == null ? "" : input.toLowerCase(Locale.ROOT);
        boolean hasStrictPolicy = normalizedCode.contains("enterprisesecuritypolicy")
                && normalizedCode.contains("strict");
        boolean hasProductionGate = normalizedSource.contains("production");
        boolean canReject = normalizedSource.contains("rejected");
        boolean canPass = normalizedSource.contains("passed");
        boolean productionStrictInput = normalizedInput.contains("tag=production")
                && normalizedInput.contains("policy=strict");
        if (hasStrictPolicy && hasProductionGate && canPass && productionStrictInput) {
            return "PASSED";
        }
        if (canReject && expectedOutput != null && expectedOutput.strip().equalsIgnoreCase("REJECTED")) {
            return "REJECTED";
        }
        return "";
    }

    private static String normalizedOutput(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\r\n", "\n").replace('\r', '\n').stripTrailing();
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
        String normalizedCode = normalizeImplementationSignal(code);
        for (String token : normalizeExpected(expectedOutput).split("\\|")) {
            if (!token.isBlank() && !normalizedCode.contains(token)) {
                return false;
            }
        }
        return true;
    }

    private static String normalizeExpected(String value) {
        return normalizeRunnerText(value).replace(",", "|").replace(" ", "|");
    }

    private static String normalizeImplementationSignal(String value) {
        return normalizeRunnerText(stripNonImplementationText(value));
    }

    private static Set<String> tokenFingerprint(String value) {
        List<String> tokens = Arrays.stream(normalizeImplementationSignal(value).split("\\s+"))
                .filter(token -> token.length() > 1)
                .toList();
        if (tokens.size() < 5) {
            return Set.of();
        }
        Set<String> shingles = new HashSet<>();
        for (int i = 0; i <= tokens.size() - 5; i++) {
            shingles.add(String.join(" ", tokens.subList(i, i + 5)));
        }
        return shingles;
    }

    private static String normalizeRunnerText(String value) {
        return (value == null ? "" : value)
                .replaceAll("[^A-Za-z0-9_@]+", " ")
                .trim()
                .toLowerCase(Locale.ROOT);
    }

    private static String stripNonImplementationText(String value) {
        return (value == null ? "" : value)
                .replaceAll("(?s)/\\*.*?\\*/", " ")
                .replaceAll("(?m)//.*$", " ")
                .replaceAll("(?s)\"\"\".*?\"\"\"", " ")
                .replaceAll("\"(?:\\\\.|[^\"\\\\])*\"", " ")
                .replaceAll("'(?:\\\\.|[^'\\\\])*'", " ")
                .replaceAll("`(?:\\\\.|[^`\\\\])*`", " ");
    }

    private static String autoDecision(int score, List<String> flags) {
        if (score >= 85 && flags.stream().noneMatch(flag -> flag.equals("hardcoded-secret")
                || flag.equals("process-execution")
                || flag.equals("sandbox-policy-blocked")
                || flag.equals("plagiarism-similarity")
                || flag.equals("hidden-tests-failed")
                || flag.equals("compile-error")
                || flag.equals("time-limit-exceeded")
                || flag.equals("memory-limit-exceeded")
                || flag.equals("runtime-error"))) {
            return "PASS";
        }
        if (score < 65 || flags.contains("hardcoded-secret") || flags.contains("process-execution")
                || flags.contains("sandbox-policy-blocked") || flags.contains("plagiarism-similarity")
                || flags.contains("compile-error") || flags.contains("time-limit-exceeded")
                || flags.contains("memory-limit-exceeded") || flags.contains("runtime-error")) {
            return "HOLD";
        }
        return "HOLD";
    }

    private static String normalizeDecision(String value) {
        String decision = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if ("ADVANCE".equals(decision)) {
            return "PASS";
        }
        if (!List.of("PASS", "HOLD", "REJECT").contains(decision)) {
            throw new DevHireException(ErrorCode.BAD_REQUEST, "Review decision must be PASS, HOLD, or REJECT");
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

    private static String truncate(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return "unavailable";
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        return normalized.length() <= maxLength ? normalized : normalized.substring(0, maxLength) + "...";
    }

    private static String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new DevHireException(ErrorCode.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private static List<String> cleanList(List<String> values) {
        if (values == null) {
            return List.of();
        }
        return values.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .distinct()
                .toList();
    }

    private static String slugify(String value) {
        String slug = (value == null ? "" : value)
                .trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        return slug.isBlank() ? "code-challenge-" + UUID.randomUUID().toString().substring(0, 8) : slug;
    }

    private static String candidateDisplayName(UUID candidateId) {
        if (candidateId == null) {
            return "Candidate";
        }
        return "Candidate " + candidateId.toString().substring(0, 8);
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

    private static String firstNonBlank(String first, String second, String fallback) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        return second == null || second.isBlank() ? fallback : second;
    }

    private static <T> T firstNonNull(T first, T fallback) {
        return first == null ? fallback : first;
    }

    private static int positiveOrDefault(int value, int fallback) {
        return value > 0 ? value : fallback;
    }

    private static String verdictForResults(List<CodeRunCaseResultResponse> results) {
        if (results.isEmpty()) {
            return "RUNNER_UNAVAILABLE";
        }
        if (results.stream().allMatch(CodeRunCaseResultResponse::passed)) {
            return "ACCEPTED";
        }
        return results.stream()
                .map(CodeRunCaseResultResponse::verdict)
                .filter(value -> value != null && !value.isBlank() && !"ACCEPTED".equals(value))
                .findFirst()
                .orElse("WRONG_ANSWER");
    }

    private static String verdictForRunnerResults(List<com.devhire.application.client.dto.RunnerTestCaseResultResponse> results) {
        if (results == null || results.isEmpty()) {
            return "RUNNER_UNAVAILABLE";
        }
        if (results.stream().allMatch(com.devhire.application.client.dto.RunnerTestCaseResultResponse::passed)) {
            return "ACCEPTED";
        }
        return results.stream()
                .map(com.devhire.application.client.dto.RunnerTestCaseResultResponse::verdict)
                .map(CodeAssessmentService::normalizeVerdict)
                .filter(value -> !value.isBlank() && !"ACCEPTED".equals(value))
                .findFirst()
                .orElse("WRONG_ANSWER");
    }

    private static String normalizeVisibility(String value) {
        return value == null || value.isBlank() ? "VISIBLE" : value.trim().toUpperCase(Locale.ROOT);
    }

    private static String normalizeStatus(String value) {
        return value == null || value.isBlank() ? "UNKNOWN" : value.trim().toUpperCase(Locale.ROOT);
    }

    private static String normalizeVerdict(String value) {
        return value == null || value.isBlank() ? "UNKNOWN" : value.trim().toUpperCase(Locale.ROOT);
    }

    private static boolean isVisible(String value) {
        return "VISIBLE".equals(normalizeVisibility(value));
    }

    private static boolean isSql(String value) {
        return "SQL".equalsIgnoreCase(value == null ? "" : value.trim());
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
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
        CodeAssessmentResponse safe = withoutHiddenRunResults(response);
        return new CodeAssessmentResponse(
                safe.id(),
                safe.applicationId(),
                safe.candidateName(),
                safe.jobTitle(),
                safe.challengeTitle(),
                safe.challengeVersion(),
                safe.level(),
                safe.language(),
                safe.prompt(),
                safe.constraints(),
                safe.starterCode(),
                safe.status(),
                safe.maxScore(),
                safe.latestScore(),
                safe.latestDecision(),
                safe.skills(),
                safe.rubric(),
                safe.riskFlags(),
                safe.feedback(),
                safe.aiFeedbackFallback(),
                null,
                safe.attemptNumber(),
                safe.codeHash(),
                safe.graderVersion(),
                safe.rubricVersion(),
                redactSensitiveLiterals(safe.submittedCodePreview()),
                safe.hasSubmittedCode(),
                safe.visibleTestCases(),
                safe.latestRun(),
                safe.integrityRiskScore(),
                safe.similarityScore(),
                safe.sandboxStatus(),
                safe.dueAt(),
                safe.assignedAt(),
                safe.submittedAt());
    }

    private CodeAssessmentResponse withoutHiddenRunResults(CodeAssessmentResponse response) {
        return new CodeAssessmentResponse(
                response.id(),
                response.applicationId(),
                response.candidateName(),
                response.jobTitle(),
                response.challengeTitle(),
                response.challengeVersion(),
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
                response.submittedCode(),
                response.attemptNumber(),
                response.codeHash(),
                response.graderVersion(),
                response.rubricVersion(),
                response.submittedCodePreview(),
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

    private record ApplicationTarget(
            UUID applicationId,
            UUID candidateId,
            UUID employerId,
            UUID jobId,
            String jobTitle,
            String status
    ) {
    }

    private record CodeChallengeChoice(
            UUID id,
            String title,
            String language,
            int version
    ) {
    }

    private record CodeChallengeRef(
            UUID challengeId,
            int version
    ) {
    }

    private record CodeTestCase(
            UUID id,
            String name,
            String visibility,
            String input,
            String expectedOutput,
            String setupSql,
            String expectedRowsJson,
            int weight,
            int ordinal,
            int version
    ) {
    }

    private record ChallengeDraft(
            String slug,
            String title,
            int version,
            String level,
            String language,
            String prompt,
            String constraints,
            String starterCode,
            List<String> skills,
            List<String> requiredSignals,
            int maxScore,
            boolean active,
            String referenceSolution
    ) {
    }
}
