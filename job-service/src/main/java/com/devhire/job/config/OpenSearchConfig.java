package com.devhire.job.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
@ConditionalOnProperty(prefix = "devhire.search", name = "provider", havingValue = "opensearch")
public class OpenSearchConfig {
    @Bean
    RestClient openSearchRestClient(OpenSearchProperties properties) {
        return RestClient.builder()
                .baseUrl(properties.url())
                .build();
    }
}
