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
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
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
}
