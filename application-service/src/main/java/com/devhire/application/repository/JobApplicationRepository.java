package com.devhire.application.repository;

import com.devhire.application.entity.JobApplication;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface JobApplicationRepository extends JpaRepository<JobApplication, UUID> {
    boolean existsByCandidateIdAndJobId(UUID candidateId, UUID jobId);

    Page<JobApplication> findByCandidateId(UUID candidateId, Pageable pageable);

    Page<JobApplication> findByJobIdAndEmployerId(UUID jobId, UUID employerId, Pageable pageable);

    Optional<JobApplication> findByIdAndCandidateId(UUID id, UUID candidateId);
}

