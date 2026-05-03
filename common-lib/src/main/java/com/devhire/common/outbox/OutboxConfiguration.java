package com.devhire.common.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
@EnableConfigurationProperties(OutboxProperties.class)
public class OutboxConfiguration {
    @Bean
    @ConditionalOnMissingBean
    OutboxEventRepository outboxEventRepository(JdbcTemplate jdbcTemplate) {
        return new OutboxEventRepository(jdbcTemplate);
    }

    @Bean
    @ConditionalOnMissingBean
    OutboxEventWriter outboxEventWriter(OutboxEventRepository repository, ObjectMapper objectMapper) {
        return new OutboxEventWriter(repository, objectMapper);
    }

    @Bean
    @ConditionalOnMissingBean
    ProcessedEventRepository processedEventRepository(JdbcTemplate jdbcTemplate) {
        return new ProcessedEventRepository(jdbcTemplate);
    }

    @Bean
    @ConditionalOnProperty(prefix = "devhire.outbox.publisher", name = "enabled", havingValue = "true")
    @ConditionalOnMissingBean
    OutboxEventPublisher outboxEventPublisher(OutboxEventRepository repository,
                                              KafkaTemplate<String, Object> kafkaTemplate,
                                              ObjectMapper objectMapper,
                                              OutboxProperties properties) {
        return new OutboxEventPublisher(repository, kafkaTemplate, objectMapper, properties);
    }
}
