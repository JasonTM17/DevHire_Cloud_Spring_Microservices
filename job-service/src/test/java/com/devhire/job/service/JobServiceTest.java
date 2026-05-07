package com.devhire.job.service;

import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.devhire.job.client.CompanyClient;
import com.devhire.job.client.dto.CompanyInternalResponse;
import com.devhire.job.dto.request.JobCreateRequest;
import com.devhire.job.entity.Job;
import com.devhire.job.entity.JobStatus;
import com.devhire.job.event.JobEventPublisher;
import com.devhire.job.mapper.JobMapper;
import com.devhire.job.repository.JobRepository;
import com.devhire.job.search.JobSearchAdapter;
import com.devhire.job.search.JobSearchIndex;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JobServiceTest {
    private final JobRepository repository = mock(JobRepository.class);
    private final CompanyClient companyClient = mock(CompanyClient.class);
    private final JobSearchAdapter searchAdapter = mock(JobSearchAdapter.class);
    private final JobSearchIndex searchIndex = mock(JobSearchIndex.class);
    private final JobEventPublisher eventPublisher = mock(JobEventPublisher.class);
    private final SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
    private final JobService service = new JobService(repository, new JobMapper(), companyClient, searchAdapter, searchIndex,
            eventPublisher, meterRegistry);

    @Test
    void employerCreatesDraftForApprovedOwnedCompany() {
        UUID employerId = UUID.randomUUID();
        UUID companyId = UUID.randomUUID();
        when(companyClient.getCompany(companyId)).thenReturn(new CompanyInternalResponse(companyId, employerId, "APPROVED", true));
        when(repository.save(any(Job.class))).thenAnswer(invocation -> {
            Job job = invocation.getArgument(0);
            ReflectionTestUtils.setField(job, "id", UUID.randomUUID());
            ReflectionTestUtils.setField(job, "createdAt", Instant.parse("2026-05-02T00:00:00Z"));
            ReflectionTestUtils.setField(job, "updatedAt", Instant.parse("2026-05-02T00:00:00Z"));
            return job;
        });

        var response = service.create(new AuthenticatedUser(employerId, "employer@example.com", UserRole.EMPLOYER),
                request(companyId));

        assertThat(response.status()).isEqualTo(JobStatus.DRAFT);
        assertThat(response.skills()).containsExactly("Java", "Kafka");
    }

    @Test
    void createRejectsUnapprovedCompany() {
        UUID employerId = UUID.randomUUID();
        UUID companyId = UUID.randomUUID();
        when(companyClient.getCompany(companyId)).thenReturn(new CompanyInternalResponse(companyId, employerId, "PENDING", false));

        assertThatThrownBy(() -> service.create(new AuthenticatedUser(employerId, "employer@example.com", UserRole.EMPLOYER),
                request(companyId))).isInstanceOf(DevHireException.class)
                .hasMessageContaining("Only approved companies");
    }

    @Test
    void adminApprovesPendingReviewJob() {
        UUID jobId = UUID.randomUUID();
        Job job = new Job(UUID.randomUUID(), UUID.randomUUID());
        job.updateContent("Senior Java", "Build APIs", "Java", "Budget", BigDecimal.ONE, BigDecimal.TEN,
                "Remote", "Senior", "Full-time", "Java");
        job.submitReview();
        ReflectionTestUtils.setField(job, "id", jobId);
        ReflectionTestUtils.setField(job, "createdAt", Instant.parse("2026-05-02T00:00:00Z"));
        ReflectionTestUtils.setField(job, "updatedAt", Instant.parse("2026-05-02T00:00:00Z"));
        when(repository.findById(jobId)).thenReturn(Optional.of(job));

        var response = service.approve(new AuthenticatedUser(UUID.randomUUID(), "admin@example.com", UserRole.ADMIN), jobId);

        assertThat(response.status()).isEqualTo(JobStatus.PUBLISHED);
        assertThat(response.publishedAt()).isNotNull();
    }

    @Test
    void publicGetOnlyReturnsPublishedJobs() {
        UUID jobId = UUID.randomUUID();
        Job job = searchableJob(jobId);
        when(repository.findByIdAndStatus(jobId, JobStatus.PUBLISHED)).thenReturn(Optional.of(job));

        var response = service.get(jobId);

        assertThat(response.status()).isEqualTo(JobStatus.PUBLISHED);
    }

    @Test
    void publicGetHidesDraftAndReviewJobs() {
        UUID jobId = UUID.randomUUID();
        when(repository.findByIdAndStatus(jobId, JobStatus.PUBLISHED)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(jobId))
                .isInstanceOf(DevHireException.class)
                .hasMessageContaining("Published job not found");
    }

    @Test
    void adminListsPendingReviewQueueByDefault() {
        var pageable = PageRequest.of(0, 10);
        Job job = new Job(UUID.randomUUID(), UUID.randomUUID());
        job.updateContent("Senior Java", "Build APIs", "Java", "Budget", BigDecimal.ONE, BigDecimal.TEN,
                "Remote", "Senior", "Full-time", "Java");
        job.submitReview();
        ReflectionTestUtils.setField(job, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(job, "createdAt", Instant.parse("2026-05-02T00:00:00Z"));
        ReflectionTestUtils.setField(job, "updatedAt", Instant.parse("2026-05-02T00:00:00Z"));
        when(repository.findByStatus(JobStatus.PENDING_REVIEW, pageable)).thenReturn(new PageImpl<>(List.of(job), pageable, 1));

        var page = service.listForAdmin(
                new AuthenticatedUser(UUID.randomUUID(), "admin@example.com", UserRole.ADMIN),
                null,
                pageable);

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().getFirst().status()).isEqualTo(JobStatus.PENDING_REVIEW);
    }

    @Test
    void searchRecordsSuccessMetricsForPublishedJobs() {
        var criteria = new com.devhire.job.dto.request.JobSearchCriteria("java", "Java", "Remote",
                BigDecimal.valueOf(3000), BigDecimal.valueOf(6000), "Senior", "Full-time", null);
        var pageable = PageRequest.of(0, 10);
        Job job = searchableJob(UUID.randomUUID());
        when(searchAdapter.searchPublished(criteria, pageable)).thenReturn(new PageImpl<>(List.of(job), pageable, 1));

        var page = service.search(criteria, pageable);

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(meterRegistry.find("devhire_job_search_requests")
                .tag("status", "success")
                .counter()
                .count()).isEqualTo(1.0d);
        assertThat(meterRegistry.find("devhire_job_search_latency")
                .tag("status", "success")
                .timer()
                .count()).isEqualTo(1L);
    }

    @Test
    void searchRecordsErrorMetricsWhenAdapterFails() {
        var criteria = new com.devhire.job.dto.request.JobSearchCriteria("java", null, null, null, null, null, null, null);
        var pageable = PageRequest.of(0, 10);
        when(searchAdapter.searchPublished(criteria, pageable)).thenThrow(new IllegalStateException("search down"));

        assertThatThrownBy(() -> service.search(criteria, pageable))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("search down");
        assertThat(meterRegistry.find("devhire_job_search_requests")
                .tag("status", "error")
                .counter()
                .count()).isEqualTo(1.0d);
        assertThat(meterRegistry.find("devhire_job_search_latency")
                .tag("status", "error")
                .timer()
                .count()).isEqualTo(1L);
    }

    private static JobCreateRequest request(UUID companyId) {
        return new JobCreateRequest(companyId, "Senior Java", "Build APIs", "Java", "Budget",
                BigDecimal.valueOf(3000), BigDecimal.valueOf(5000), "Remote", "Senior", "Full-time",
                List.of("Java", "Kafka"));
    }

    private static Job searchableJob(UUID id) {
        Job job = new Job(UUID.randomUUID(), UUID.randomUUID());
        job.updateContent("Senior Java", "Build APIs", "Java", "Budget", BigDecimal.ONE, BigDecimal.TEN,
                "Remote", "Senior", "Full-time", "Java,Kafka");
        job.submitReview();
        job.approve();
        ReflectionTestUtils.setField(job, "id", id);
        ReflectionTestUtils.setField(job, "createdAt", Instant.parse("2026-05-02T00:00:00Z"));
        ReflectionTestUtils.setField(job, "updatedAt", Instant.parse("2026-05-02T00:00:00Z"));
        return job;
    }
}
