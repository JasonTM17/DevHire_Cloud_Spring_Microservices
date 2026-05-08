package com.devhire.company.controller;

import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.UserRole;
import com.devhire.common.web.GlobalExceptionHandler;
import com.devhire.company.dto.request.CompanyCreateRequest;
import com.devhire.company.dto.response.CompanyResponse;
import com.devhire.company.entity.CompanyStatus;
import com.devhire.company.service.CompanyService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.standaloneSetup;

class CompanyControllerTest {
    private final CompanyService companyService = mock(CompanyService.class);
    private final MockMvc mockMvc = standaloneSetup(new CompanyController(companyService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @Test
    void createCompanyReturnsPendingCompany() throws Exception {
        UUID companyId = UUID.randomUUID();
        UUID employerId = UUID.randomUUID();
        when(companyService.create(any(), any())).thenReturn(new CompanyResponse(
                companyId, employerId, "DevHire Labs", "devhire-labs", null,
                "https://devhire.local", "51-200", "HR Tech", "Hiring platform",
                CompanyStatus.PENDING, null, Instant.parse("2026-05-02T00:00:00Z"),
                Instant.parse("2026-05-02T00:00:00Z")
        ));

        mockMvc.perform(post("/companies")
                        .header(AppHeaders.USER_ID, employerId)
                        .header(AppHeaders.USER_EMAIL, "employer@example.com")
                        .header(AppHeaders.USER_ROLE, UserRole.EMPLOYER.name())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CompanyCreateRequest(
                                "DevHire Labs", null, "https://devhire.local", "51-200", "HR Tech", "Hiring platform"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id", is(companyId.toString())))
                .andExpect(jsonPath("$.data.status", is("PENDING")));
    }

    @Test
    void createCompanyRejectsBlankName() throws Exception {
        UUID employerId = UUID.randomUUID();
        mockMvc.perform(post("/companies")
                        .header(AppHeaders.USER_ID, employerId)
                        .header(AppHeaders.USER_EMAIL, "employer@example.com")
                        .header(AppHeaders.USER_ROLE, UserRole.EMPLOYER.name())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": ""
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("VALIDATION_ERROR")));
    }

    @Test
    void getCompanyBySlugReturnsApprovedPublicProfile() throws Exception {
        UUID companyId = UUID.randomUUID();
        UUID employerId = UUID.randomUUID();
        when(companyService.getApprovedBySlug("devhire-labs")).thenReturn(new CompanyResponse(
                companyId, employerId, "DevHire Labs", "devhire-labs", null,
                "https://devhire.local", "51-200", "HR Tech", "Hiring platform",
                CompanyStatus.APPROVED, null, Instant.parse("2026-05-02T00:00:00Z"),
                Instant.parse("2026-05-02T00:00:00Z")
        ));

        mockMvc.perform(get("/companies/slug/devhire-labs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.slug", is("devhire-labs")))
                .andExpect(jsonPath("$.data.status", is("APPROVED")));
    }

    @Test
    void publicListReturnsApprovedCompaniesOnly() throws Exception {
        UUID companyId = UUID.randomUUID();
        UUID employerId = UUID.randomUUID();
        when(companyService.listPublic(any())).thenReturn(new PageImpl<>(List.of(new CompanyResponse(
                companyId, employerId, "DevHire Labs", "devhire-labs", null,
                "https://devhire.local", "51-200", "HR Tech", "Hiring platform",
                CompanyStatus.APPROVED, null, Instant.parse("2026-05-02T00:00:00Z"),
                Instant.parse("2026-05-02T00:00:00Z")
        )), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/companies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].status", is("APPROVED")));
    }

    @Test
    void adminCanListCompaniesByReviewStatus() throws Exception {
        UUID companyId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();
        UUID employerId = UUID.randomUUID();
        when(companyService.listForAdmin(any(), any(), any())).thenReturn(new PageImpl<>(List.of(new CompanyResponse(
                companyId, employerId, "DevHire Labs", "devhire-labs", null,
                "https://devhire.local", "51-200", "HR Tech", "Hiring platform",
                CompanyStatus.PENDING, null, Instant.parse("2026-05-02T00:00:00Z"),
                Instant.parse("2026-05-02T00:00:00Z")
        )), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/companies?status=PENDING")
                        .header(AppHeaders.USER_ID, adminId)
                        .header(AppHeaders.USER_EMAIL, "admin@example.com")
                        .header(AppHeaders.USER_ROLE, UserRole.ADMIN.name()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].status", is("PENDING")));
    }

    @Test
    void employerCanListOwnCompanies() throws Exception {
        UUID companyId = UUID.randomUUID();
        UUID employerId = UUID.randomUUID();
        when(companyService.listForEmployer(any(), any())).thenReturn(new PageImpl<>(List.of(new CompanyResponse(
                companyId, employerId, "DevHire Labs", "devhire-labs", null,
                "https://devhire.local", "51-200", "HR Tech", "Hiring platform",
                CompanyStatus.PENDING, null, Instant.parse("2026-05-02T00:00:00Z"),
                Instant.parse("2026-05-02T00:00:00Z")
        )), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/employer/companies")
                        .header(AppHeaders.USER_ID, employerId)
                        .header(AppHeaders.USER_EMAIL, "employer@example.com")
                        .header(AppHeaders.USER_ROLE, UserRole.EMPLOYER.name()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].employerId", is(employerId.toString())));
    }
}
