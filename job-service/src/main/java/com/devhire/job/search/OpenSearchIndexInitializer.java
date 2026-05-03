package com.devhire.job.search;

import com.devhire.job.config.OpenSearchProperties;
import com.devhire.job.entity.Job;
import com.devhire.job.entity.JobStatus;
import com.devhire.job.repository.JobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "devhire.search", name = "provider", havingValue = "opensearch")
public class OpenSearchIndexInitializer implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(OpenSearchIndexInitializer.class);

    private final OpenSearchClient client;
    private final OpenSearchProperties properties;
    private final JobRepository repository;
    private final JobSearchIndex searchIndex;

    public OpenSearchIndexInitializer(OpenSearchClient client,
                                      OpenSearchProperties properties,
                                      JobRepository repository,
                                      JobSearchIndex searchIndex) {
        this.client = client;
        this.properties = properties;
        this.repository = repository;
        this.searchIndex = searchIndex;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (properties.autoCreateIndex()) {
            try {
                client.ensureJobIndex(properties.index());
            } catch (RuntimeException ex) {
                log.warn("opensearch_index_bootstrap_failed index={} message={}", properties.index(), ex.getMessage());
                if (!properties.fallbackToPostgres()) {
                    throw ex;
                }
                return;
            }
        }

        var publishedJobs = repository.findByStatus(JobStatus.PUBLISHED);
        for (Job job : publishedJobs) {
            searchIndex.sync(job);
        }
        log.info("opensearch_job_reindex_completed index={} publishedJobs={}", properties.index(), publishedJobs.size());
    }
}
