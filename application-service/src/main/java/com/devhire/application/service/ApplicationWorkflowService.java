package com.devhire.application.service;

import com.devhire.application.client.JobClient;
import com.devhire.application.client.dto.JobInternalResponse;
import com.devhire.application.dto.request.ApplicationStatusUpdateRequest;
import com.devhire.application.dto.request.SubmitApplicationRequest;
import com.devhire.application.dto.response.ApplicationResponse;
import com.devhire.application.entity.ApplicationStatus;
import com.devhire.application.entity.ApplicationStatusHistory;
import com.devhire.application.entity.JobApplication;
import com.devhire.application.event.ApplicationEventPublisher;
import com.devhire.application.mapper.ApplicationMapper;
import com.devhire.application.repository.ApplicationStatusHistoryRepository;
import com.devhire.application.repository.JobApplicationRepository;
import com.devhire.common.error.ErrorCode;
import com.devhire.common.event.ApplicationStatusChangedEvent;
import com.devhire.common.event.ApplicationSubmittedEvent;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import feign.FeignException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Service
public class ApplicationWorkflowService {
    private final JobApplicationRepository applicationRepository;
    private final ApplicationStatusHistoryRepository historyRepository;
    private final JobClient jobClient;
    private final ApplicationMapper mapper;
    private final ApplicationEventPublisher eventPublisher;

    public ApplicationWorkflowService(JobApplicationRepository applicationRepository,
                                      ApplicationStatusHistoryRepository historyRepository,
                                      JobClient jobClient,
                                      ApplicationMapper mapper,
                                      ApplicationEventPublisher eventPublisher) {
        this.applicationRepository = applicationRepository;
        this.historyRepository = historyRepository;
        this.jobClient = jobClient;
        this.mapper = mapper;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public ApplicationResponse submit(AuthenticatedUser candidate, UUID jobId, SubmitApplicationRequest request) {
        requireRole(candidate, UserRole.CANDIDATE);
        JobInternalResponse job = getJob(jobId);
        if (!job.published()) {
            throw new DevHireException(ErrorCode.BAD_REQUEST, "Candidates can only apply to published jobs");
        }
        if (applicationRepository.existsByCandidateIdAndJobId(candidate.id(), jobId)) {
            throw new DevHireException(ErrorCode.CONFLICT, "Candidate has already applied to this job");
        }
        JobApplication application = applicationRepository.save(new JobApplication(
                job.id(), job.companyId(), job.employerId(), candidate.id(), job.title(), request.cvUrl(), request.coverLetter()));
        historyRepository.save(new ApplicationStatusHistory(application.getId(), null, application.getStatus(),
                candidate.id(), candidate.role().name(), "Application submitted"));
        eventPublisher.publishSubmitted(new ApplicationSubmittedEvent(UUID.randomUUID(), application.getId(), job.id(),
                candidate.id(), job.employerId(), job.title(), Instant.now()));
        eventPublisher.publishAudit(AuditEvent.now(candidate.id(), candidate.email(), candidate.role().name(),
                "submit application", "application", application.getId().toString(), Map.of("jobId", job.id().toString())));
        return mapper.toResponse(application);
    }

    @Transactional(readOnly = true)
    public Page<ApplicationResponse> findMine(AuthenticatedUser candidate, Pageable pageable) {
        requireRole(candidate, UserRole.CANDIDATE);
        return applicationRepository.findByCandidateId(candidate.id(), pageable).map(mapper::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<ApplicationResponse> findForEmployerJob(AuthenticatedUser employer, UUID jobId, Pageable pageable) {
        requireRole(employer, UserRole.EMPLOYER);
        JobInternalResponse job = getJob(jobId);
        if (!job.employerId().equals(employer.id())) {
            throw new DevHireException(ErrorCode.FORBIDDEN, "Job does not belong to employer");
        }
        return applicationRepository.findByJobIdAndEmployerId(jobId, employer.id(), pageable).map(mapper::toResponse);
    }

    @Transactional
    public ApplicationResponse updateStatus(AuthenticatedUser employer, UUID applicationId,
                                            ApplicationStatusUpdateRequest request) {
        requireRole(employer, UserRole.EMPLOYER);
        if (request.status() == ApplicationStatus.SUBMITTED || request.status() == ApplicationStatus.WITHDRAWN) {
            throw new DevHireException(ErrorCode.BAD_REQUEST, "Employer cannot set this application status");
        }
        JobApplication application = find(applicationId);
        if (!application.getEmployerId().equals(employer.id())) {
            throw new DevHireException(ErrorCode.FORBIDDEN, "Application does not belong to employer");
        }
        ApplicationStatus oldStatus = application.changeStatus(request.status());
        historyRepository.save(new ApplicationStatusHistory(application.getId(), oldStatus, request.status(),
                employer.id(), employer.role().name(), request.note()));
        eventPublisher.publishStatusChanged(new ApplicationStatusChangedEvent(UUID.randomUUID(), application.getId(),
                application.getJobId(), application.getCandidateId(), application.getEmployerId(),
                oldStatus.name(), request.status().name(), Instant.now()));
        eventPublisher.publishAudit(AuditEvent.now(employer.id(), employer.email(), employer.role().name(),
                "change application status", "application", application.getId().toString(),
                Map.of("oldStatus", oldStatus.name(), "newStatus", request.status().name())));
        return mapper.toResponse(application);
    }

    @Transactional
    public ApplicationResponse withdraw(AuthenticatedUser candidate, UUID applicationId) {
        requireRole(candidate, UserRole.CANDIDATE);
        JobApplication application = applicationRepository.findByIdAndCandidateId(applicationId, candidate.id())
                .orElseThrow(() -> new DevHireException(ErrorCode.NOT_FOUND, "Application not found"));
        ApplicationStatus oldStatus = application.changeStatus(ApplicationStatus.WITHDRAWN);
        historyRepository.save(new ApplicationStatusHistory(application.getId(), oldStatus, ApplicationStatus.WITHDRAWN,
                candidate.id(), candidate.role().name(), "Candidate withdrew application"));
        eventPublisher.publishStatusChanged(new ApplicationStatusChangedEvent(UUID.randomUUID(), application.getId(),
                application.getJobId(), application.getCandidateId(), application.getEmployerId(),
                oldStatus.name(), ApplicationStatus.WITHDRAWN.name(), Instant.now()));
        return mapper.toResponse(application);
    }

    private JobApplication find(UUID id) {
        return applicationRepository.findById(id)
                .orElseThrow(() -> new DevHireException(ErrorCode.NOT_FOUND, "Application not found"));
    }

    private JobInternalResponse getJob(UUID jobId) {
        try {
            return jobClient.getJob(jobId);
        } catch (FeignException.NotFound ex) {
            throw new DevHireException(ErrorCode.BAD_REQUEST, "Job not found");
        }
    }

    private static void requireRole(AuthenticatedUser user, UserRole role) {
        if (user.role() != role) {
            throw new DevHireException(ErrorCode.FORBIDDEN, "Required role: " + role);
        }
    }
}

