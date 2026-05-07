package com.devhire.job.repository;

import com.devhire.job.entity.Job;
import com.devhire.job.entity.JobStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JobRepository extends JpaRepository<Job, UUID>, JpaSpecificationExecutor<Job> {
    List<Job> findByStatus(JobStatus status);

    Page<Job> findByStatus(JobStatus status, Pageable pageable);

    Optional<Job> findByIdAndStatus(UUID id, JobStatus status);
}
