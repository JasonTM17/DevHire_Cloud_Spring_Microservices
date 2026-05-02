package com.devhire.job.search;

import com.devhire.job.dto.request.JobSearchCriteria;
import com.devhire.job.entity.Job;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface JobSearchAdapter {
    Page<Job> searchPublished(JobSearchCriteria criteria, Pageable pageable);
}

