package com.devhire.job.mapper;

import com.devhire.job.dto.response.JobResponse;
import com.devhire.job.entity.Job;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class JobMapper {
    public JobResponse toResponse(Job job) {
        return new JobResponse(
                job.getId(),
                job.getCompanyId(),
                job.getEmployerId(),
                job.getTitle(),
                job.getDescription(),
                job.getRequirements(),
                job.getBenefits(),
                job.getSalaryMin(),
                job.getSalaryMax(),
                job.getLocation(),
                job.getLevel(),
                job.getType(),
                toSkills(job.getSkillsCsv()),
                job.getStatus(),
                job.getRejectionReason(),
                job.getPublishedAt(),
                job.getCreatedAt(),
                job.getUpdatedAt()
        );
    }

    public String toSkillsCsv(List<String> skills) {
        if (skills == null || skills.isEmpty()) {
            return null;
        }
        return String.join(",", skills.stream()
                .map(String::trim)
                .filter(skill -> !skill.isBlank())
                .distinct()
                .toList());
    }

    private static List<String> toSkills(String skillsCsv) {
        if (skillsCsv == null || skillsCsv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(skillsCsv.split(","))
                .map(String::trim)
                .filter(skill -> !skill.isBlank())
                .toList();
    }
}

