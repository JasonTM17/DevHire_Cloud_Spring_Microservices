package com.devhire.job.search;

import com.devhire.job.dto.request.JobSearchCriteria;
import com.devhire.job.entity.Job;
import com.devhire.job.entity.JobStatus;
import com.devhire.job.repository.JobRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Locale;

@Component
public class PostgresJobSearchAdapter implements JobSearchAdapter {
    private final JobRepository repository;

    public PostgresJobSearchAdapter(JobRepository repository) {
        this.repository = repository;
    }

    @Override
    public Page<Job> searchPublished(JobSearchCriteria criteria, Pageable pageable) {
        return repository.findAll(spec(criteria), pageable);
    }

    private static Specification<Job> spec(JobSearchCriteria criteria) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();
            predicates.add(cb.equal(root.get("status"), JobStatus.PUBLISHED));
            if (notBlank(criteria.keyword())) {
                String like = "%" + criteria.keyword().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), like),
                        cb.like(cb.lower(root.get("description")), like),
                        cb.like(cb.lower(root.get("requirements")), like)
                ));
            }
            if (notBlank(criteria.skill())) {
                predicates.add(cb.like(cb.lower(root.get("skillsCsv")),
                        "%" + criteria.skill().toLowerCase(Locale.ROOT) + "%"));
            }
            if (notBlank(criteria.location())) {
                predicates.add(cb.like(cb.lower(root.get("location")),
                        "%" + criteria.location().toLowerCase(Locale.ROOT) + "%"));
            }
            if (notBlank(criteria.level())) {
                predicates.add(cb.equal(cb.lower(root.get("level")), criteria.level().toLowerCase(Locale.ROOT)));
            }
            if (notBlank(criteria.type())) {
                predicates.add(cb.equal(cb.lower(root.get("type")), criteria.type().toLowerCase(Locale.ROOT)));
            }
            if (criteria.companyId() != null) {
                predicates.add(cb.equal(root.get("companyId"), criteria.companyId()));
            }
            if (criteria.salaryMin() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("salaryMax"), criteria.salaryMin()));
            }
            if (criteria.salaryMax() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("salaryMin"), criteria.salaryMax()));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}
