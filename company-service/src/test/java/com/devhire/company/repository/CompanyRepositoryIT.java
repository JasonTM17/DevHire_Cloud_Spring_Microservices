package com.devhire.company.repository;

import com.devhire.company.entity.Company;
import com.devhire.company.entity.CompanyStatus;
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

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@Testcontainers(disabledWithoutDocker = true)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class CompanyRepositoryIT {
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
    private CompanyRepository companyRepository;

    @Test
    void flywaySeedCreatesPortfolioCompaniesAndStatusSegments() {
        assertThat(companyRepository.count()).isGreaterThanOrEqualTo(27);
        assertThat(companyRepository.existsBySlug("atlas-talent-cloud")).isTrue();
        assertThat(companyRepository.findByStatus(CompanyStatus.APPROVED, PageRequest.of(0, 30)).getTotalElements())
                .isGreaterThanOrEqualTo(23);
        assertThat(companyRepository.findByStatus(CompanyStatus.PENDING, PageRequest.of(0, 10)).getTotalElements())
                .isGreaterThanOrEqualTo(2);
        assertThat(companyRepository.findByStatus(CompanyStatus.REJECTED, PageRequest.of(0, 10)).getTotalElements())
                .isGreaterThanOrEqualTo(1);
    }

    @Test
    void approvalWorkflowAndSlugUniquenessArePersisted() {
        UUID employerId = UUID.fromString("10000000-0000-0000-0002-000000000012");
        Company company = new Company(employerId, "Portfolio Edge Labs", "portfolio-edge-labs",
                "https://cdn.devhire.local/logos/edge-labs.svg", "https://edge.devhire.local",
                "101-250", "Platform Engineering", "A seeded workflow validation company.");

        Company saved = companyRepository.saveAndFlush(company);
        assertThat(saved.getStatus()).isEqualTo(CompanyStatus.PENDING);

        saved.approve();
        companyRepository.saveAndFlush(saved);
        assertThat(companyRepository.findById(saved.getId()).orElseThrow().getStatus()).isEqualTo(CompanyStatus.APPROVED);

        Company duplicate = new Company(employerId, "Duplicate Edge Labs", "portfolio-edge-labs",
                null, null, "1-10", "Testing", "Duplicate slug should fail.");
        assertThatThrownBy(() -> companyRepository.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
