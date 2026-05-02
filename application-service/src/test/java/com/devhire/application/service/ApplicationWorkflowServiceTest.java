package com.devhire.application.service;

import com.devhire.application.client.JobClient;
import com.devhire.application.client.dto.JobInternalResponse;
import com.devhire.application.dto.request.ApplicationStatusUpdateRequest;
import com.devhire.application.dto.request.SubmitApplicationRequest;
import com.devhire.application.entity.ApplicationStatus;
import com.devhire.application.entity.JobApplication;
import com.devhire.application.event.ApplicationEventPublisher;
import com.devhire.application.mapper.ApplicationMapper;
import com.devhire.application.repository.ApplicationStatusHistoryRepository;
import com.devhire.application.repository.JobApplicationRepository;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ApplicationWorkflowServiceTest {
    private final JobApplicationRepository applicationRepository = mock(JobApplicationRepository.class);
    private final ApplicationStatusHistoryRepository historyRepository = mock(ApplicationStatusHistoryRepository.class);
    private final JobClient jobClient = mock(JobClient.class);
    private final ApplicationEventPublisher eventPublisher = mock(ApplicationEventPublisher.class);
    private final ApplicationWorkflowService service = new ApplicationWorkflowService(
            applicationRepository, historyRepository, jobClient, new ApplicationMapper(), eventPublisher);

    @Test
    void candidateSubmitsApplicationForPublishedJob() {
        UUID jobId = UUID.randomUUID();
        UUID employerId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        when(jobClient.getJob(jobId)).thenReturn(new JobInternalResponse(jobId, UUID.randomUUID(), employerId,
                "Senior Java", "PUBLISHED", true));
        when(applicationRepository.existsByCandidateIdAndJobId(candidateId, jobId)).thenReturn(false);
        when(applicationRepository.save(any(JobApplication.class))).thenAnswer(invocation -> persisted(invocation.getArgument(0)));

        var response = service.submit(new AuthenticatedUser(candidateId, "candidate@example.com", UserRole.CANDIDATE),
                jobId, new SubmitApplicationRequest("https://cv.example/cv.pdf", "Hello"));

        assertThat(response.status()).isEqualTo(ApplicationStatus.SUBMITTED);
        assertThat(response.employerId()).isEqualTo(employerId);
    }

    @Test
    void candidateCannotApplyTwice() {
        UUID jobId = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        UUID employerId = UUID.randomUUID();
        when(jobClient.getJob(jobId)).thenReturn(new JobInternalResponse(jobId, UUID.randomUUID(), employerId,
                "Senior Java", "PUBLISHED", true));
        when(applicationRepository.existsByCandidateIdAndJobId(candidateId, jobId)).thenReturn(true);

        assertThatThrownBy(() -> service.submit(
                new AuthenticatedUser(candidateId, "candidate@example.com", UserRole.CANDIDATE),
                jobId, new SubmitApplicationRequest("https://cv.example/cv.pdf", "Hello")
        )).isInstanceOf(DevHireException.class)
                .hasMessageContaining("already applied");
    }

    @Test
    void employerUpdatesApplicationStatus() {
        UUID employerId = UUID.randomUUID();
        UUID appId = UUID.randomUUID();
        JobApplication application = new JobApplication(UUID.randomUUID(), UUID.randomUUID(), employerId, UUID.randomUUID(),
                "Senior Java", "https://cv.example/cv.pdf", "Hello");
        ReflectionTestUtils.setField(application, "id", appId);
        ReflectionTestUtils.setField(application, "createdAt", Instant.parse("2026-05-02T00:00:00Z"));
        ReflectionTestUtils.setField(application, "updatedAt", Instant.parse("2026-05-02T00:00:00Z"));
        when(applicationRepository.findById(appId)).thenReturn(Optional.of(application));

        var response = service.updateStatus(new AuthenticatedUser(employerId, "employer@example.com", UserRole.EMPLOYER),
                appId, new ApplicationStatusUpdateRequest(ApplicationStatus.INTERVIEW, "Interview"));

        assertThat(response.status()).isEqualTo(ApplicationStatus.INTERVIEW);
    }

    private static JobApplication persisted(JobApplication application) {
        ReflectionTestUtils.setField(application, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(application, "createdAt", Instant.parse("2026-05-02T00:00:00Z"));
        ReflectionTestUtils.setField(application, "updatedAt", Instant.parse("2026-05-02T00:00:00Z"));
        return application;
    }
}

