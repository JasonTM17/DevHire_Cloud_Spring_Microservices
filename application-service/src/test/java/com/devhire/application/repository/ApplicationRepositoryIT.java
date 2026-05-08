package com.devhire.application.repository;

import com.devhire.application.entity.ApplicationStatus;
import com.devhire.application.entity.ApplicationStatusHistory;
import com.devhire.application.entity.JobApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@Testcontainers(disabledWithoutDocker = true)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ApplicationRepositoryIT {
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17-alpine");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired
    private JobApplicationRepository applicationRepository;

    @Autowired
    private ApplicationStatusHistoryRepository historyRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void flywaySeedCreatesApplicationVolumeAndCandidateViews() {
        UUID candidateId = UUID.fromString("10000000-0000-0000-0001-000000000001");

        assertThat(applicationRepository.count()).isGreaterThanOrEqualTo(243);
        assertThat(historyRepository.count()).isGreaterThanOrEqualTo(355);
        assertThat(applicationRepository.findByCandidateId(candidateId, PageRequest.of(0, 10)).getTotalElements())
                .isGreaterThanOrEqualTo(4);
    }

    @Test
    void flywaySeedCreatesCodeAssessmentTablesAndProductionConstraints() {
        Integer challengeCount = jdbcTemplate.queryForObject("SELECT count(*) FROM code_challenges", Integer.class);
        Integer assignmentCount = jdbcTemplate.queryForObject("SELECT count(*) FROM code_assessment_assignments", Integer.class);
        Integer submissionCount = jdbcTemplate.queryForObject("SELECT count(*) FROM code_submissions", Integer.class);
        Integer completeMetadata = jdbcTemplate.queryForObject("""
                SELECT count(*)
                FROM code_submissions
                WHERE attempt_number IS NOT NULL
                  AND code_hash ~ '^[0-9a-f]{64}$'
                  AND grader_version = 'static-rubric-v1'
                  AND rubric_version = 'devhire-code-rubric-v1'
                """, Integer.class);
        Integer hardeningConstraints = jdbcTemplate.queryForObject("""
                SELECT count(*)
                FROM information_schema.table_constraints
                WHERE table_schema = 'public'
                  AND table_name = 'code_submissions'
                  AND constraint_name IN (
                    'chk_code_submission_static_score_range',
                    'chk_code_submission_final_score_range',
                    'chk_code_submission_attempt_positive',
                    'chk_code_submission_hash_sha256',
                    'chk_code_submission_grader_version_present',
                    'chk_code_submission_rubric_version_present'
                  )
                """, Integer.class);
        Integer uniqueAttemptIndex = jdbcTemplate.queryForObject("""
                SELECT count(*)
                FROM pg_indexes
                WHERE schemaname = 'public'
                  AND tablename = 'code_submissions'
                  AND indexname = 'uq_code_submissions_assignment_attempt'
                """, Integer.class);
        Integer reviewGuardrails = jdbcTemplate.queryForObject("""
                SELECT count(*)
                FROM information_schema.table_constraints
                WHERE table_schema = 'public'
                  AND constraint_name IN (
                    'chk_code_challenge_language_supported',
                    'chk_code_assessment_due_after_assigned',
                    'chk_code_submission_language_supported',
                    'chk_code_submission_text_length',
                    'chk_code_submission_reviewed_after_submitted'
                  )
                """, Integer.class);

        assertThat(challengeCount).isGreaterThanOrEqualTo(3);
        assertThat(assignmentCount).isGreaterThanOrEqualTo(18);
        assertThat(submissionCount).isGreaterThanOrEqualTo(1);
        assertThat(completeMetadata).isEqualTo(submissionCount);
        assertThat(hardeningConstraints).isEqualTo(6);
        assertThat(uniqueAttemptIndex).isEqualTo(1);
        assertThat(reviewGuardrails).isEqualTo(5);
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void duplicateCandidateJobConstraintIsEnforcedByDatabase() {
        UUID candidateId = UUID.fromString("10000000-0000-0000-0001-000000000001");
        UUID jobId = UUID.fromString("30000000-0000-0000-0001-000000000007");
        UUID companyId = UUID.fromString("20000000-0000-0000-0001-000000000007");
        UUID employerId = UUID.fromString("10000000-0000-0000-0002-000000000007");

        assertThat(applicationRepository.existsByCandidateIdAndJobId(candidateId, jobId)).isTrue();

        JobApplication duplicate = new JobApplication(jobId, companyId, employerId, candidateId,
                "Duplicate seeded application", "https://cdn.devhire.local/cv/duplicate.pdf", "Duplicate");
        assertThatThrownBy(() -> applicationRepository.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void statusHistoryTransitionIsPersistedWithApplicationUpdate() {
        UUID candidateId = UUID.fromString("10000000-0000-0000-0001-000000000001");
        UUID employerId = UUID.fromString("10000000-0000-0000-0002-000000000007");

        JobApplication application = applicationRepository.findByCandidateId(candidateId, PageRequest.of(0, 1))
                .getContent()
                .getFirst();
        ApplicationStatus oldStatus = application.changeStatus(ApplicationStatus.INTERVIEW);
        applicationRepository.saveAndFlush(application);
        historyRepository.saveAndFlush(new ApplicationStatusHistory(application.getId(), oldStatus,
                ApplicationStatus.INTERVIEW, employerId, "EMPLOYER", "Integration test transition"));

        assertThat(historyRepository.count()).isGreaterThanOrEqualTo(356);
        assertThat(applicationRepository.findById(application.getId()).orElseThrow().getStatus())
                .isEqualTo(ApplicationStatus.INTERVIEW);
    }
}
