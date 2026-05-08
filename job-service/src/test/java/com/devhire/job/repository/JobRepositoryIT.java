package com.devhire.job.repository;

import com.devhire.job.entity.Job;
import com.devhire.job.entity.JobStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.UUID;

import com.devhire.job.dto.request.JobSearchCriteria;
import com.devhire.job.search.PostgresJobSearchAdapter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@Testcontainers(disabledWithoutDocker = true)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JobRepositoryIT {
    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");

    @Autowired
    private JobRepository jobRepository;

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Test
    void flywaySeedsJobsAndRepositoryPersistsWorkflowState() {
        assertThat(jobRepository.count()).isGreaterThanOrEqualTo(10);

        Job job = new Job(UUID.randomUUID(), UUID.randomUUID());
        job.updateContent(
                "Platform Engineer",
                "Build developer platform services",
                "Java, Kubernetes, PostgreSQL",
                "Remote-first team",
                BigDecimal.valueOf(3500),
                BigDecimal.valueOf(6500),
                "Ho Chi Minh City",
                "Senior",
                "FULL_TIME",
                "Java,Kubernetes,PostgreSQL"
        );
        job.submitReview();
        job.approve();

        Job saved = jobRepository.saveAndFlush(job);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(JobStatus.PUBLISHED);
        assertThat(saved.getPublishedAt()).isNotNull();
    }

    @Test
    void databaseRejectsInvalidSalaryRange() {
        Job job = new Job(UUID.randomUUID(), UUID.randomUUID());
        job.updateContent(
                "Invalid Salary Job",
                "This row should be rejected by the database",
                null,
                null,
                BigDecimal.valueOf(7000),
                BigDecimal.valueOf(3000),
                "Remote",
                "Senior",
                "FULL_TIME",
                "Java"
        );

        assertThatThrownBy(() -> jobRepository.saveAndFlush(job))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void postgresSearchFiltersPublishedJobsByCompanyAndType() {
        UUID targetCompanyId = UUID.randomUUID();
        UUID otherCompanyId = UUID.randomUUID();
        Job target = publishedJob(targetCompanyId, "Senior Platform Engineer", "Full-time");
        Job wrongCompany = publishedJob(otherCompanyId, "Senior Platform Engineer", "Full-time");
        Job wrongType = publishedJob(targetCompanyId, "Senior Platform Contractor", "Contract");
        jobRepository.saveAndFlush(target);
        jobRepository.saveAndFlush(wrongCompany);
        jobRepository.saveAndFlush(wrongType);

        var adapter = new PostgresJobSearchAdapter(jobRepository);
        var page = adapter.searchPublished(new JobSearchCriteria(
                "Platform", null, null, null, null, "Senior", "Full-time", targetCompanyId),
                PageRequest.of(0, 10));

        assertThat(page.getContent()).extracting(Job::getId).contains(target.getId());
        assertThat(page.getContent()).extracting(Job::getId).doesNotContain(wrongCompany.getId(), wrongType.getId());
    }

    private static Job publishedJob(UUID companyId, String title, String type) {
        Job job = new Job(companyId, UUID.randomUUID());
        job.updateContent(
                title,
                "Build developer platform services",
                "Java, Kubernetes, PostgreSQL",
                "Remote-first team",
                BigDecimal.valueOf(3500),
                BigDecimal.valueOf(6500),
                "Remote",
                "Senior",
                type,
                "Java,Kubernetes,PostgreSQL"
        );
        job.submitReview();
        job.approve();
        return job;
    }
}
