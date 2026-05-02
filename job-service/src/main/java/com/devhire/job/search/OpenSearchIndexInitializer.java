package com.devhire.job.search;

import com.devhire.job.config.OpenSearchProperties;
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

    public OpenSearchIndexInitializer(OpenSearchClient client, OpenSearchProperties properties) {
        this.client = client;
        this.properties = properties;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!properties.autoCreateIndex()) {
            return;
        }
        try {
            client.ensureJobIndex(properties.index());
        } catch (RuntimeException ex) {
            log.warn("opensearch_index_bootstrap_failed index={} message={}", properties.index(), ex.getMessage());
            if (!properties.fallbackToPostgres()) {
                throw ex;
            }
        }
    }
}
