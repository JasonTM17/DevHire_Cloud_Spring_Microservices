package com.devhire.company.controller;

import com.devhire.common.ApiResponse;
import com.devhire.common.constants.AppHeaders;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.devhire.company.dto.request.CompanyCreateRequest;
import com.devhire.company.dto.request.CompanyReviewRequest;
import com.devhire.company.dto.response.CompanyInternalResponse;
import com.devhire.company.dto.response.CompanyResponse;
import com.devhire.company.entity.CompanyStatus;
import com.devhire.company.service.CompanyService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class CompanyController {
    private final CompanyService companyService;

    public CompanyController(CompanyService companyService) {
        this.companyService = companyService;
    }

    @PostMapping("/companies")
    public ApiResponse<CompanyResponse> create(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                               @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                               @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                               @Valid @RequestBody CompanyCreateRequest request) {
        return ApiResponse.ok(companyService.create(new AuthenticatedUser(userId, email, role), request));
    }

    @GetMapping("/companies/{id}")
    public ApiResponse<CompanyResponse> get(@PathVariable UUID id) {
        return ApiResponse.ok(companyService.get(id));
    }

    @GetMapping("/companies/slug/{slug}")
    public ApiResponse<CompanyResponse> getBySlug(@PathVariable String slug) {
        return ApiResponse.ok(companyService.getApprovedBySlug(slug));
    }

    @GetMapping("/companies")
    public ApiResponse<Page<CompanyResponse>> list(@RequestHeader(value = AppHeaders.USER_ID, required = false) UUID userId,
                                                   @RequestHeader(value = AppHeaders.USER_EMAIL, required = false) String email,
                                                   @RequestHeader(value = AppHeaders.USER_ROLE, required = false) UserRole role,
                                                   @RequestParam(required = false) CompanyStatus status,
                                                   Pageable pageable) {
        if (status != null) {
            return ApiResponse.ok(companyService.listForAdmin(new AuthenticatedUser(userId, email, role), status, pageable));
        }
        return ApiResponse.ok(companyService.listPublic(pageable));
    }

    @GetMapping("/employer/companies")
    public ApiResponse<Page<CompanyResponse>> listEmployerCompanies(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                                    @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                                    @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                                    Pageable pageable) {
        return ApiResponse.ok(companyService.listForEmployer(new AuthenticatedUser(userId, email, role), pageable));
    }

    @PatchMapping("/admin/companies/{id}/approve")
    public ApiResponse<CompanyResponse> approve(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                                @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                                @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                                @PathVariable UUID id) {
        return ApiResponse.ok(companyService.approve(new AuthenticatedUser(userId, email, role), id));
    }

    @PatchMapping("/admin/companies/{id}/reject")
    public ApiResponse<CompanyResponse> reject(@RequestHeader(AppHeaders.USER_ID) UUID userId,
                                               @RequestHeader(AppHeaders.USER_EMAIL) String email,
                                               @RequestHeader(AppHeaders.USER_ROLE) UserRole role,
                                               @PathVariable UUID id,
                                               @Valid @RequestBody CompanyReviewRequest request) {
        return ApiResponse.ok(companyService.reject(new AuthenticatedUser(userId, email, role), id, request.reason()));
    }

    @GetMapping("/internal/companies/{id}")
    public CompanyInternalResponse internalGet(@PathVariable UUID id) {
        return companyService.getInternal(id);
    }
}
