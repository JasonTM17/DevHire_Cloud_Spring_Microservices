package com.devhire.application.mapper;

import com.devhire.application.dto.response.ApplicationResponse;
import com.devhire.application.entity.JobApplication;
import org.springframework.stereotype.Component;

@Component
public class ApplicationMapper {
    public ApplicationResponse toResponse(JobApplication application) {
        return new ApplicationResponse(
                application.getId(),
                application.getJobId(),
                application.getCompanyId(),
                application.getEmployerId(),
                application.getCandidateId(),
                application.getJobTitle(),
                application.getCvUrl(),
                application.getCoverLetter(),
                application.getStatus(),
                application.getCreatedAt(),
                application.getUpdatedAt()
        );
    }
}

