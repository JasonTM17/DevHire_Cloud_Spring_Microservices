package com.devhire.job.service;

import com.devhire.common.error.ErrorCode;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.event.JobApprovedEvent;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.devhire.job.client.CompanyClient;
import com.devhire.job.client.dto.CompanyInternalResponse;
import com.devhire.job.dto.request.JobCreateRequest;
import com.devhire.job.dto.request.JobSearchCriteria;
import com.devhire.job.dto.response.JobInternalResponse;
import com.devhire.job.dto.response.JobResponse;
import com.devhire.job.entity.Job;
import com.devhire.job.entity.JobStatus;
import com.devhire.job.event.JobEventPublisher;
import com.devhire.job.mapper.JobMapper;
import com.devhire.job.repository.JobRepository;
import com.devhire.job.search.JobSearchAdapter;
import com.devhire.job.search.JobSearchIndex;
import feign.FeignException;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@Service
public class JobService {
    private final JobRepository repository;
    private final JobMapper mapper;
    private final CompanyClient companyClient;
    private final JobSearchAdapter searchAdapter;
    private final JobSearchIndex searchIndex;
    private final JobEventPublisher eventPublisher;
    private final MeterRegistry meterRegistry;

    public JobService(JobRepository repository, JobMapper mapper, CompanyClient companyClient,
                      JobSearchAdapter searchAdapter, JobSearchIndex searchIndex, JobEventPublisher eventPublisher,
                      MeterRegistry meterRegistry) {
        this.repository = repository;
        this.mapper = mapper;
        this.companyClient = companyClient;
        this.searchAdapter = searchAdapter;
        this.searchIndex = searchIndex;
        this.eventPublisher = eventPublisher;
        this.meterRegistry = meterRegistry;
    }

    @Transactional
    public JobResponse create(AuthenticatedUser user, JobCreateRequest request) {
        requireRole(user, UserRole.EMPLOYER);
        CompanyInternalResponse company = approvedCompanyForEmployer(request.companyId(), user.id());
        Job job = new Job(company.id(), user.id());
        applyContent(job, request);
        Job saved = repository.save(job);
        eventPublisher.publishAudit(AuditEvent.now(user.id(), user.email(), user.role().name(),
                "create job", "job", saved.getId().toString(), Map.of("companyId", company.id().toString())));
        return mapper.toResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<JobResponse> search(JobSearchCriteria criteria, Pageable pageable) {
        long start = System.nanoTime();
        String adapter = searchAdapter.getClass().getSimpleName();
        try {
            Page<JobResponse> response = searchAdapter.searchPublished(criteria, pageable).map(mapper::toResponse);
            recordSearch(adapter, "success", start);
            return response;
        } catch (RuntimeException ex) {
            recordSearch(adapter, "error", start);
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public JobResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    @Transactional(readOnly = true)
    public JobInternalResponse getInternal(UUID id) {
        Job job = find(id);
        return new JobInternalResponse(
                job.getId(),
                job.getCompanyId(),
                job.getEmployerId(),
                job.getTitle(),
                job.getStatus(),
                job.getStatus() == JobStatus.PUBLISHED
        );
    }

    @Transactional
    public JobResponse update(AuthenticatedUser user, UUID id, JobCreateRequest request) {
        requireRole(user, UserRole.EMPLOYER);
        Job job = find(id);
        requireOwner(user, job);
        approvedCompanyForEmployer(request.companyId(), user.id());
        applyContent(job, request);
        searchIndex.sync(job);
        return mapper.toResponse(job);
    }

    @Transactional
    public JobResponse submitReview(AuthenticatedUser user, UUID id) {
        requireRole(user, UserRole.EMPLOYER);
        Job job = find(id);
        requireOwner(user, job);
        job.submitReview();
        searchIndex.remove(job);
        return mapper.toResponse(job);
    }

    @Transactional
    public JobResponse approve(AuthenticatedUser admin, UUID id) {
        requireRole(admin, UserRole.ADMIN);
        Job job = find(id);
        if (job.getStatus() != JobStatus.PENDING_REVIEW) {
            throw new DevHireException(ErrorCode.BAD_REQUEST, "Only pending jobs can be approved");
        }
        job.approve();
        searchIndex.sync(job);
        eventPublisher.publishAudit(AuditEvent.now(admin.id(), admin.email(), admin.role().name(),
                "approve job", "job", job.getId().toString(), Map.of()));
        eventPublisher.publishJobApproved(new JobApprovedEvent(
                UUID.randomUUID(), job.getId(), job.getEmployerId(), job.getTitle(), Instant.now()));
        return mapper.toResponse(job);
    }

    @Transactional
    public JobResponse reject(AuthenticatedUser admin, UUID id, String reason) {
        requireRole(admin, UserRole.ADMIN);
        Job job = find(id);
        job.reject(reason);
        searchIndex.remove(job);
        eventPublisher.publishAudit(AuditEvent.now(admin.id(), admin.email(), admin.role().name(),
                "reject job", "job", job.getId().toString(), Map.of("reason", reason == null ? "" : reason)));
        return mapper.toResponse(job);
    }

    @Transactional
    public JobResponse close(AuthenticatedUser user, UUID id) {
        requireRole(user, UserRole.EMPLOYER);
        Job job = find(id);
        requireOwner(user, job);
        job.close();
        searchIndex.remove(job);
        return mapper.toResponse(job);
    }

    private void applyContent(Job job, JobCreateRequest request) {
        validateSalary(request.salaryMin(), request.salaryMax());
        job.updateContent(
                request.title().trim(),
                request.description(),
                request.requirements(),
                request.benefits(),
                request.salaryMin(),
                request.salaryMax(),
                request.location(),
                request.level(),
                request.type(),
                mapper.toSkillsCsv(request.skills())
        );
    }

    private CompanyInternalResponse approvedCompanyForEmployer(UUID companyId, UUID employerId) {
        CompanyInternalResponse company;
        try {
            company = companyClient.getCompany(companyId);
        } catch (FeignException.NotFound ex) {
            throw new DevHireException(ErrorCode.BAD_REQUEST, "Company not found");
        }
        if (!company.approved()) {
            throw new DevHireException(ErrorCode.BAD_REQUEST, "Only approved companies can publish job drafts");
        }
        if (!company.employerId().equals(employerId)) {
            throw new DevHireException(ErrorCode.FORBIDDEN, "Company does not belong to employer");
        }
        return company;
    }

    private Job find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new DevHireException(ErrorCode.NOT_FOUND, "Job not found"));
    }

    private static void requireOwner(AuthenticatedUser user, Job job) {
        if (!job.getEmployerId().equals(user.id())) {
            throw new DevHireException(ErrorCode.FORBIDDEN, "Job does not belong to employer");
        }
    }

    private static void requireRole(AuthenticatedUser user, UserRole role) {
        if (user.role() != role) {
            throw new DevHireException(ErrorCode.FORBIDDEN, "Required role: " + role);
        }
    }

    private static void validateSalary(BigDecimal min, BigDecimal max) {
        if (min != null && max != null && min.compareTo(max) > 0) {
            throw new DevHireException(ErrorCode.BAD_REQUEST, "salaryMin must be less than or equal to salaryMax");
        }
    }

    private void recordSearch(String adapter, String status, long startNanos) {
        Counter.builder("devhire_job_search_requests")
                .description("DevHire job search requests")
                .tag("adapter", adapter)
                .tag("status", status)
                .register(meterRegistry)
                .increment();
        Timer.builder("devhire_job_search_latency")
                .description("DevHire job search request latency")
                .tag("adapter", adapter)
                .tag("status", status)
                .register(meterRegistry)
                .record(Duration.ofNanos(System.nanoTime() - startNanos));
    }
}
