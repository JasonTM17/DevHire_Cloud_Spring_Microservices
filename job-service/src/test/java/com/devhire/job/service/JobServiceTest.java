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
    private final JobService service = new JobService(repository, new JobMapper(), companyClient, searchAdapter, searchIndex,
            eventPublisher, new SimpleMeterRegistry());

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

    private static JobCreateRequest request(UUID companyId) {
        return new JobCreateRequest(companyId, "Senior Java", "Build APIs", "Java", "Budget",
                BigDecimal.valueOf(3000), BigDecimal.valueOf(5000), "Remote", "Senior", "Full-time",
                List.of("Java", "Kafka"));
    }
}
