package com.devhire.company.service;

import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.devhire.company.dto.request.CompanyCreateRequest;
import com.devhire.company.entity.Company;
import com.devhire.company.entity.CompanyStatus;
import com.devhire.company.event.CompanyEventPublisher;
import com.devhire.company.mapper.CompanyMapper;
import com.devhire.company.repository.CompanyRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CompanyServiceTest {
    private final CompanyRepository repository = mock(CompanyRepository.class);
    private final CompanyEventPublisher eventPublisher = mock(CompanyEventPublisher.class);
    private final CompanyService service = new CompanyService(repository, new CompanyMapper(), eventPublisher);

    @Test
    void employerCreatesPendingCompanyWithSlug() {
        when(repository.existsBySlug("devhire-labs")).thenReturn(false);
        when(repository.save(any(Company.class))).thenAnswer(invocation -> {
            Company company = invocation.getArgument(0);
            ReflectionTestUtils.setField(company, "id", UUID.randomUUID());
            ReflectionTestUtils.setField(company, "createdAt", Instant.parse("2026-05-02T00:00:00Z"));
            ReflectionTestUtils.setField(company, "updatedAt", Instant.parse("2026-05-02T00:00:00Z"));
            return company;
        });

        var response = service.create(new AuthenticatedUser(UUID.randomUUID(), "employer@example.com", UserRole.EMPLOYER),
                new CompanyCreateRequest("DevHire Labs", null, "https://devhire.local", "51-200",
                        "HR Tech", "Hiring platform"));

        assertThat(response.slug()).isEqualTo("devhire-labs");
        assertThat(response.status()).isEqualTo(CompanyStatus.PENDING);
        verify(eventPublisher).publishAudit(any());
    }

    @Test
    void duplicateSlugIsRejectedBeforePersistence() {
        when(repository.existsBySlug("devhire-labs")).thenReturn(true);

        assertThatThrownBy(() -> service.create(
                new AuthenticatedUser(UUID.randomUUID(), "employer@example.com", UserRole.EMPLOYER),
                new CompanyCreateRequest("DevHire Labs", null, null, null, null, null)
        )).isInstanceOf(DevHireException.class)
                .hasMessageContaining("Company slug already exists");
    }

    @Test
    void invalidCompanyNameCannotProduceSlug() {
        assertThatThrownBy(() -> service.create(
                new AuthenticatedUser(UUID.randomUUID(), "employer@example.com", UserRole.EMPLOYER),
                new CompanyCreateRequest("!!!", null, null, null, null, null)
        )).isInstanceOf(DevHireException.class)
                .hasMessageContaining("Company name cannot produce a valid slug");
    }

    @Test
    void candidateCannotCreateCompany() {
        assertThatThrownBy(() -> service.create(
                new AuthenticatedUser(UUID.randomUUID(), "candidate@example.com", UserRole.CANDIDATE),
                new CompanyCreateRequest("DevHire Labs", null, null, null, null, null)
        )).isInstanceOf(DevHireException.class)
                .hasMessageContaining("Required role: EMPLOYER");
    }

    @Test
    void adminApprovesCompany() {
        Company company = new Company(UUID.randomUUID(), "DevHire Labs", "devhire-labs", null, null, null, null, null);
        UUID companyId = UUID.randomUUID();
        ReflectionTestUtils.setField(company, "id", companyId);
        ReflectionTestUtils.setField(company, "createdAt", Instant.parse("2026-05-02T00:00:00Z"));
        ReflectionTestUtils.setField(company, "updatedAt", Instant.parse("2026-05-02T00:00:00Z"));
        when(repository.findById(companyId)).thenReturn(Optional.of(company));

        var response = service.approve(new AuthenticatedUser(UUID.randomUUID(), "admin@example.com", UserRole.ADMIN), companyId);

        assertThat(response.status()).isEqualTo(CompanyStatus.APPROVED);
        verify(eventPublisher).publishAudit(any());
        verify(eventPublisher).publishCompanyReviewed(any());
    }

    @Test
    void approvedCompanyCanBeLoadedByPublicSlug() {
        Company company = new Company(UUID.randomUUID(), "DevHire Labs", "devhire-labs", null, null, null, null, null);
        UUID companyId = UUID.randomUUID();
        ReflectionTestUtils.setField(company, "id", companyId);
        ReflectionTestUtils.setField(company, "createdAt", Instant.parse("2026-05-02T00:00:00Z"));
        ReflectionTestUtils.setField(company, "updatedAt", Instant.parse("2026-05-02T00:00:00Z"));
        company.approve();
        when(repository.findBySlug("devhire-labs")).thenReturn(Optional.of(company));

        var response = service.getApprovedBySlug("devhire-labs");

        assertThat(response.id()).isEqualTo(companyId);
        assertThat(response.slug()).isEqualTo("devhire-labs");
        assertThat(response.status()).isEqualTo(CompanyStatus.APPROVED);
    }

    @Test
    void pendingCompanyIsHiddenFromPublicSlugLookup() {
        Company company = new Company(UUID.randomUUID(), "DevHire Labs", "devhire-labs", null, null, null, null, null);
        ReflectionTestUtils.setField(company, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(company, "createdAt", Instant.parse("2026-05-02T00:00:00Z"));
        ReflectionTestUtils.setField(company, "updatedAt", Instant.parse("2026-05-02T00:00:00Z"));
        when(repository.findBySlug("devhire-labs")).thenReturn(Optional.of(company));

        assertThatThrownBy(() -> service.getApprovedBySlug("devhire-labs"))
                .isInstanceOf(DevHireException.class)
                .hasMessageContaining("Approved company not found");
    }

    @Test
    void pendingCompanyIsHiddenFromPublicIdLookup() {
        UUID companyId = UUID.randomUUID();
        when(repository.findByIdAndStatus(companyId, CompanyStatus.APPROVED)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(companyId))
                .isInstanceOf(DevHireException.class)
                .hasMessageContaining("Approved company not found");
    }

    @Test
    void publicCompanyListOnlyReturnsApprovedCompanies() {
        Company company = approvedCompany();
        when(repository.findByStatus(CompanyStatus.APPROVED, PageRequest.of(0, 5)))
                .thenReturn(new PageImpl<>(List.of(company), PageRequest.of(0, 5), 1));

        var page = service.listPublic(PageRequest.of(0, 5));

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().getFirst().status()).isEqualTo(CompanyStatus.APPROVED);
    }

    @Test
    void employerCompanyListIsScopedToAuthenticatedEmployer() {
        UUID employerId = UUID.randomUUID();
        Company company = approvedCompany(employerId);
        when(repository.findByEmployerId(employerId, PageRequest.of(0, 5)))
                .thenReturn(new PageImpl<>(List.of(company), PageRequest.of(0, 5), 1));

        var page = service.listForEmployer(
                new AuthenticatedUser(employerId, "employer@example.com", UserRole.EMPLOYER),
                PageRequest.of(0, 5));

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().getFirst().employerId()).isEqualTo(employerId);
    }

    @Test
    void adminCanListCompaniesByReviewStatus() {
        Company company = new Company(UUID.randomUUID(), "DevHire Labs", "devhire-labs", null, null, null, null, null);
        stamp(company, UUID.randomUUID());
        when(repository.findByStatus(CompanyStatus.PENDING, PageRequest.of(0, 5)))
                .thenReturn(new PageImpl<>(List.of(company), PageRequest.of(0, 5), 1));

        var page = service.listForAdmin(
                new AuthenticatedUser(UUID.randomUUID(), "admin@example.com", UserRole.ADMIN),
                CompanyStatus.PENDING,
                PageRequest.of(0, 5));

        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().getFirst().status()).isEqualTo(CompanyStatus.PENDING);
    }

    @Test
    void nonAdminCannotApproveCompany() {
        assertThatThrownBy(() -> service.approve(
                new AuthenticatedUser(UUID.randomUUID(), "employer@example.com", UserRole.EMPLOYER),
                UUID.randomUUID()
        )).isInstanceOf(DevHireException.class)
                .hasMessageContaining("Required role: ADMIN");
    }

    @Test
    void adminRejectsCompanyWithReason() {
        Company company = new Company(UUID.randomUUID(), "DevHire Labs", "devhire-labs", null, null, null, null, null);
        UUID companyId = UUID.randomUUID();
        ReflectionTestUtils.setField(company, "id", companyId);
        ReflectionTestUtils.setField(company, "createdAt", Instant.parse("2026-05-02T00:00:00Z"));
        ReflectionTestUtils.setField(company, "updatedAt", Instant.parse("2026-05-02T00:00:00Z"));
        when(repository.findById(companyId)).thenReturn(Optional.of(company));

        var response = service.reject(
                new AuthenticatedUser(UUID.randomUUID(), "admin@example.com", UserRole.ADMIN),
                companyId,
                "Missing company verification");

        assertThat(response.status()).isEqualTo(CompanyStatus.REJECTED);
        assertThat(response.rejectionReason()).isEqualTo("Missing company verification");
        verify(eventPublisher).publishAudit(any());
        verify(eventPublisher).publishCompanyReviewed(any());
    }

    private static Company approvedCompany() {
        return approvedCompany(UUID.randomUUID());
    }

    private static Company approvedCompany(UUID employerId) {
        Company company = new Company(employerId, "DevHire Labs", "devhire-labs", null, null, null, null, null);
        stamp(company, UUID.randomUUID());
        company.approve();
        return company;
    }

    private static void stamp(Company company, UUID id) {
        ReflectionTestUtils.setField(company, "id", id);
        ReflectionTestUtils.setField(company, "createdAt", Instant.parse("2026-05-02T00:00:00Z"));
        ReflectionTestUtils.setField(company, "updatedAt", Instant.parse("2026-05-02T00:00:00Z"));
    }
}
