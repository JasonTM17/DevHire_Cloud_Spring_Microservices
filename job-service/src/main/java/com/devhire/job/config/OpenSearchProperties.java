package com.devhire.job.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "devhire.search.opensearch")
public record OpenSearchProperties(
        String url,
        String index,
        boolean autoCreateIndex,
        boolean fallbackToPostgres
) {
    public OpenSearchProperties {
        if (url == null || url.isBlank()) {
            url = "http://localhost:9200";
        }
        if (index == null || index.isBlank()) {
            index = "devhire_jobs";
        }
    }
}
