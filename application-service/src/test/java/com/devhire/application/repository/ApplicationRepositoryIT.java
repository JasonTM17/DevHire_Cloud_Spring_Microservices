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

    @Test
    void flywaySeedCreatesApplicationVolumeAndCandidateViews() {
        UUID candidateId = UUID.fromString("10000000-0000-0000-0001-000000000001");

        assertThat(applicationRepository.count()).isGreaterThanOrEqualTo(243);
        assertThat(historyRepository.count()).isGreaterThanOrEqualTo(355);
        assertThat(applicationRepository.findByCandidateId(candidateId, PageRequest.of(0, 10)).getTotalElements())
                .isGreaterThanOrEqualTo(4);
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
