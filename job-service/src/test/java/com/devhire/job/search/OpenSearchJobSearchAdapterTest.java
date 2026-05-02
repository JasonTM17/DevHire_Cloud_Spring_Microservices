package com.devhire.job.search;

import com.devhire.job.config.OpenSearchProperties;
import com.devhire.job.dto.request.JobSearchCriteria;
import com.devhire.job.entity.Job;
import com.devhire.job.entity.JobStatus;
import com.devhire.job.repository.JobRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OpenSearchJobSearchAdapterTest {
    private final OpenSearchClient client = mock(OpenSearchClient.class);
    private final JobRepository repository = mock(JobRepository.class);
    private final PostgresJobSearchAdapter fallback = mock(PostgresJobSearchAdapter.class);
    private final OpenSearchProperties properties = new OpenSearchProperties(
            "http://localhost:9200", "devhire_jobs", true, true);
    private final OpenSearchJobSearchAdapter adapter = new OpenSearchJobSearchAdapter(client, properties, repository, fallback);

    @Test
    void searchUsesOpenSearchIdsAndPreservesHitOrder() {
        UUID firstId = UUID.randomUUID();
        UUID secondId = UUID.randomUUID();
        Job first = publishedJob(firstId, "Senior Java");
        Job second = publishedJob(secondId, "Platform Engineer");
        when(client.search(eq("devhire_jobs"), any())).thenReturn(new OpenSearchSearchResult(
                List.of(new OpenSearchHit(secondId.toString()), new OpenSearchHit(firstId.toString())),
                2
        ));
        when(repository.findAllById(List.of(secondId, firstId))).thenReturn(List.of(first, second));

        var page = adapter.searchPublished(new JobSearchCriteria("java", "Java", "Remote",
                BigDecimal.valueOf(2000), BigDecimal.valueOf(7000), "Senior"), PageRequest.of(0, 10));

        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent()).extracting(Job::getId).containsExactly(secondId, firstId);
    }

    @Test
    void searchFallsBackToPostgresWhenOpenSearchFails() {
        var pageable = PageRequest.of(0, 10);
        var criteria = new JobSearchCriteria("java", null, null, null, null, null);
        Job job = publishedJob(UUID.randomUUID(), "Senior Java");
        when(client.search(eq("devhire_jobs"), any())).thenThrow(new IllegalStateException("cluster unavailable"));
        when(fallback.searchPublished(criteria, pageable)).thenReturn(new PageImpl<>(List.of(job), pageable, 1));

        var page = adapter.searchPublished(criteria, pageable);

        assertThat(page.getContent()).containsExactly(job);
        verify(fallback).searchPublished(criteria, pageable);
    }

    @Test
    void indexWritesPublishedJobDocument() {
        OpenSearchJobSearchIndex index = new OpenSearchJobSearchIndex(client, properties);
        Job job = publishedJob(UUID.randomUUID(), "Senior Java");

        index.sync(job);

        verify(client).index(eq("devhire_jobs"), eq(job.getId().toString()), any(Map.class));
    }

    private static Job publishedJob(UUID id, String title) {
        Job job = new Job(UUID.randomUUID(), UUID.randomUUID());
        job.updateContent(title, "Build hiring APIs", "Java and Kafka", "Remote budget",
                BigDecimal.valueOf(3000), BigDecimal.valueOf(6000), "Remote", "Senior",
                "Full-time", "Java,Kafka");
        job.submitReview();
        job.approve();
        ReflectionTestUtils.setField(job, "id", id);
        ReflectionTestUtils.setField(job, "createdAt", Instant.parse("2026-05-02T00:00:00Z"));
        ReflectionTestUtils.setField(job, "updatedAt", Instant.parse("2026-05-02T00:00:00Z"));
        return job;
    }
}
