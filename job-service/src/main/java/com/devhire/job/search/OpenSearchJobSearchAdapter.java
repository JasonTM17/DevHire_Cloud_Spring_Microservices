package com.devhire.job.search;

import com.devhire.job.config.OpenSearchProperties;
import com.devhire.job.dto.request.JobSearchCriteria;
import com.devhire.job.entity.Job;
import com.devhire.job.entity.JobStatus;
import com.devhire.job.repository.JobRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Primary
@Component
@ConditionalOnProperty(prefix = "devhire.search", name = "provider", havingValue = "opensearch")
public class OpenSearchJobSearchAdapter implements JobSearchAdapter {
    private static final Logger log = LoggerFactory.getLogger(OpenSearchJobSearchAdapter.class);

    private final OpenSearchClient client;
    private final OpenSearchProperties properties;
    private final JobRepository repository;
    private final PostgresJobSearchAdapter fallback;
    private final MeterRegistry meterRegistry;

    public OpenSearchJobSearchAdapter(OpenSearchClient client,
                                      OpenSearchProperties properties,
                                      JobRepository repository,
                                      PostgresJobSearchAdapter fallback,
                                      MeterRegistry meterRegistry) {
        this.client = client;
        this.properties = properties;
        this.repository = repository;
        this.fallback = fallback;
        this.meterRegistry = meterRegistry;
    }

    @Override
    public Page<Job> searchPublished(JobSearchCriteria criteria, Pageable pageable) {
        try {
            OpenSearchSearchResult result = client.search(properties.index(), request(criteria, pageable));
            List<UUID> ids = result.hits().stream()
                    .map(OpenSearchHit::id)
                    .map(UUID::fromString)
                    .toList();
            if (ids.isEmpty()) {
                return Page.empty(pageable);
            }
            Map<UUID, Job> jobsById = repository.findAllById(ids).stream()
                    .filter(job -> job.getStatus() == JobStatus.PUBLISHED)
                    .collect(Collectors.toMap(Job::getId, Function.identity()));
            List<Job> ordered = ids.stream()
                    .map(jobsById::get)
                    .filter(job -> job != null)
                    .toList();
            return new PageImpl<>(ordered, pageable, result.total());
        } catch (RuntimeException ex) {
            log.warn("opensearch_job_search_failed message={}", ex.getMessage());
            if (properties.fallbackToPostgres()) {
                Counter.builder("devhire_job_search_requests")
                        .description("DevHire job search requests")
                        .tag("adapter", "OpenSearchJobSearchAdapter")
                        .tag("status", "fallback")
                        .register(meterRegistry)
                        .increment();
                return fallback.searchPublished(criteria, pageable);
            }
            throw ex;
        }
    }

    private static Map<String, Object> request(JobSearchCriteria criteria, Pageable pageable) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("from", pageable.isPaged() ? Math.toIntExact(pageable.getOffset()) : 0);
        request.put("size", pageable.isPaged() ? pageable.getPageSize() : 20);
        request.put("track_total_hits", true);
        request.put("query", Map.of("bool", bool(criteria)));
        request.put("sort", sort(pageable));
        return request;
    }

    private static Map<String, Object> bool(JobSearchCriteria criteria) {
        List<Map<String, Object>> must = new ArrayList<>();
        List<Map<String, Object>> filter = new ArrayList<>();
        filter.add(Map.of("term", Map.of("status", JobStatus.PUBLISHED.name())));
        if (notBlank(criteria.keyword())) {
            must.add(Map.of("multi_match", Map.of(
                    "query", criteria.keyword(),
                    "fields", List.of("title^3", "description", "requirements", "benefits", "skills")
            )));
        }
        if (notBlank(criteria.skill())) {
            filter.add(Map.of("term", Map.of("skills", criteria.skill().trim())));
        }
        if (notBlank(criteria.location())) {
            must.add(Map.of("match", Map.of("location", criteria.location().trim())));
        }
        if (notBlank(criteria.level())) {
            filter.add(Map.of("term", Map.of("level", criteria.level().trim())));
        }
        if (notBlank(criteria.type())) {
            filter.add(Map.of("term", Map.of("type", criteria.type().trim())));
        }
        if (criteria.companyId() != null) {
            filter.add(Map.of("term", Map.of("companyId", criteria.companyId().toString())));
        }
        if (criteria.salaryMin() != null) {
            filter.add(range("salaryMax", "gte", criteria.salaryMin()));
        }
        if (criteria.salaryMax() != null) {
            filter.add(range("salaryMin", "lte", criteria.salaryMax()));
        }
        Map<String, Object> bool = new LinkedHashMap<>();
        bool.put("filter", filter);
        if (!must.isEmpty()) {
            bool.put("must", must);
        }
        return bool;
    }

    private static Map<String, Object> range(String field, String operator, BigDecimal value) {
        return Map.of("range", Map.of(field, Map.of(operator, value)));
    }

    private static List<Map<String, Object>> sort(Pageable pageable) {
        if (pageable.getSort().isUnsorted()) {
            return List.of(
                    Map.of("_score", Map.of("order", "desc")),
                    Map.of("publishedAt", Map.of("order", "desc", "missing", "_last"))
            );
        }
        List<Map<String, Object>> sorts = new ArrayList<>();
        for (Sort.Order order : pageable.getSort()) {
            String field = sortField(order.getProperty());
            if (field != null) {
                sorts.add(Map.of(field, Map.of("order", order.getDirection().name().toLowerCase(Locale.ROOT))));
            }
        }
        if (sorts.isEmpty()) {
            return sort(Pageable.unpaged());
        }
        return sorts;
    }

    private static String sortField(String property) {
        return switch (property) {
            case "title" -> "title.keyword";
            case "location" -> "location.keyword";
            case "level", "type", "salaryMin", "salaryMax", "publishedAt", "createdAt" -> property;
            default -> null;
        };
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
