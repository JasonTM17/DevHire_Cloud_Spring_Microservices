package com.devhire.company.repository;

import com.devhire.company.entity.Company;
import com.devhire.company.entity.CompanyStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CompanyRepository extends JpaRepository<Company, UUID> {
    boolean existsBySlug(String slug);

    Page<Company> findByStatus(CompanyStatus status, Pageable pageable);
}

