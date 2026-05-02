package com.devhire.job.search;

import com.devhire.job.config.OpenSearchProperties;
import com.devhire.job.entity.Job;
import com.devhire.job.entity.JobStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@ConditionalOnProperty(prefix = "devhire.search", name = "provider", havingValue = "opensearch")
public class OpenSearchJobSearchIndex implements JobSearchIndex {
    private static final Logger log = LoggerFactory.getLogger(OpenSearchJobSearchIndex.class);

    private final OpenSearchClient client;
    private final OpenSearchProperties properties;

    public OpenSearchJobSearchIndex(OpenSearchClient client, OpenSearchProperties properties) {
        this.client = client;
        this.properties = properties;
    }

    @Override
    public void sync(Job job) {
        if (job.getId() == null) {
            return;
        }
        if (job.getStatus() != JobStatus.PUBLISHED) {
            remove(job);
            return;
        }
        try {
            client.index(properties.index(), job.getId().toString(), document(job));
        } catch (RuntimeException ex) {
            log.warn("opensearch_job_index_failed jobId={} message={}", job.getId(), ex.getMessage());
            if (!properties.fallbackToPostgres()) {
                throw ex;
            }
        }
    }

    @Override
    public void remove(Job job) {
        if (job.getId() == null) {
            return;
        }
        try {
            client.delete(properties.index(), job.getId().toString());
        } catch (RuntimeException ex) {
            log.warn("opensearch_job_delete_failed jobId={} message={}", job.getId(), ex.getMessage());
            if (!properties.fallbackToPostgres()) {
                throw ex;
            }
        }
    }

    private static Map<String, Object> document(Job job) {
        Map<String, Object> document = new LinkedHashMap<>();
        document.put("id", job.getId().toString());
        document.put("companyId", job.getCompanyId().toString());
        document.put("employerId", job.getEmployerId().toString());
        document.put("title", job.getTitle());
        document.put("description", job.getDescription());
        document.put("requirements", job.getRequirements());
        document.put("benefits", job.getBenefits());
        document.put("salaryMin", job.getSalaryMin());
        document.put("salaryMax", job.getSalaryMax());
        document.put("location", job.getLocation());
        document.put("level", job.getLevel());
        document.put("type", job.getType());
        document.put("skills", skills(job.getSkillsCsv()));
        document.put("status", job.getStatus().name());
        document.put("publishedAt", job.getPublishedAt());
        document.put("createdAt", job.getCreatedAt());
        document.put("updatedAt", job.getUpdatedAt());
        return document;
    }

    private static List<String> skills(String skillsCsv) {
        if (skillsCsv == null || skillsCsv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(skillsCsv.split(","))
                .map(String::trim)
                .filter(skill -> !skill.isBlank())
                .toList();
    }
}
