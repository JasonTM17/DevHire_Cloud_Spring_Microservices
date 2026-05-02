package com.devhire.company.service;

import com.devhire.common.error.ErrorCode;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.event.CompanyReviewedEvent;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.devhire.company.dto.request.CompanyCreateRequest;
import com.devhire.company.dto.response.CompanyInternalResponse;
import com.devhire.company.dto.response.CompanyResponse;
import com.devhire.company.entity.Company;
import com.devhire.company.entity.CompanyStatus;
import com.devhire.company.event.CompanyEventPublisher;
import com.devhire.company.mapper.CompanyMapper;
import com.devhire.company.repository.CompanyRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class CompanyService {
    private final CompanyRepository repository;
    private final CompanyMapper mapper;
    private final CompanyEventPublisher eventPublisher;

    public CompanyService(CompanyRepository repository, CompanyMapper mapper, CompanyEventPublisher eventPublisher) {
        this.repository = repository;
        this.mapper = mapper;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public CompanyResponse create(AuthenticatedUser user, CompanyCreateRequest request) {
        requireRole(user, UserRole.EMPLOYER);
        String slug = slugify(request.name());
        if (repository.existsBySlug(slug)) {
            throw new DevHireException(ErrorCode.CONFLICT, "Company slug already exists");
        }
        Company company = repository.save(new Company(
                user.id(),
                request.name().trim(),
                slug,
                request.logoUrl(),
                request.website(),
                request.size(),
                request.industry(),
                request.description()
        ));
        eventPublisher.publishAudit(AuditEvent.now(user.id(), user.email(), user.role().name(),
                "create company", "company", company.getId().toString(), Map.of("slug", company.getSlug())));
        return mapper.toResponse(company);
    }

    @Transactional(readOnly = true)
    public CompanyResponse get(UUID id) {
        return mapper.toResponse(find(id));
    }

    @Transactional(readOnly = true)
    public CompanyInternalResponse getInternal(UUID id) {
        return mapper.toInternal(find(id));
    }

    @Transactional(readOnly = true)
    public Page<CompanyResponse> list(CompanyStatus status, Pageable pageable) {
        Page<Company> page = status == null ? repository.findAll(pageable) : repository.findByStatus(status, pageable);
        return page.map(mapper::toResponse);
    }

    @Transactional
    public CompanyResponse approve(AuthenticatedUser admin, UUID id) {
        requireRole(admin, UserRole.ADMIN);
        Company company = find(id);
        company.approve();
        eventPublisher.publishAudit(AuditEvent.now(admin.id(), admin.email(), admin.role().name(),
                "approve company", "company", company.getId().toString(), Map.of()));
        eventPublisher.publishCompanyReviewed(new CompanyReviewedEvent(
                UUID.randomUUID(), company.getId(), company.getEmployerId(), company.getStatus().name(), Instant.now()));
        return mapper.toResponse(company);
    }

    @Transactional
    public CompanyResponse reject(AuthenticatedUser admin, UUID id, String reason) {
        requireRole(admin, UserRole.ADMIN);
        Company company = find(id);
        company.reject(reason);
        eventPublisher.publishAudit(AuditEvent.now(admin.id(), admin.email(), admin.role().name(),
                "reject company", "company", company.getId().toString(), Map.of("reason", reason == null ? "" : reason)));
        eventPublisher.publishCompanyReviewed(new CompanyReviewedEvent(
                UUID.randomUUID(), company.getId(), company.getEmployerId(), company.getStatus().name(), Instant.now()));
        return mapper.toResponse(company);
    }

    private Company find(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new DevHireException(ErrorCode.NOT_FOUND, "Company not found"));
    }

    private static void requireRole(AuthenticatedUser user, UserRole role) {
        if (user.role() != role) {
            throw new DevHireException(ErrorCode.FORBIDDEN, "Required role: " + role);
        }
    }

    private static String slugify(String value) {
        String normalized = Normalizer.normalize(value.trim().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        String slug = normalized.replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        if (slug.isBlank()) {
            throw new DevHireException(ErrorCode.BAD_REQUEST, "Company name cannot produce a valid slug");
        }
        return slug;
    }
}

