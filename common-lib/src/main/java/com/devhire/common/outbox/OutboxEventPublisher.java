package com.devhire.common.outbox;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class OutboxEventPublisher {
    private static final Logger log = LoggerFactory.getLogger(OutboxEventPublisher.class);

    private final OutboxEventRepository repository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final OutboxProperties properties;

    public OutboxEventPublisher(OutboxEventRepository repository,
                                KafkaTemplate<String, Object> kafkaTemplate,
                                ObjectMapper objectMapper,
                                OutboxProperties properties) {
        this.repository = repository;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.properties = properties;
    }

    @Scheduled(fixedDelayString = "${devhire.outbox.publisher.fixed-delay-ms:5000}")
    @Transactional
    public void publishPending() {
        List<OutboxEventRecord> records = repository.findPublishable(properties.batchSize());
        for (OutboxEventRecord record : records) {
            publish(record);
        }
    }

    private void publish(OutboxEventRecord record) {
        try {
            Object payload = objectMapper.readValue(record.payload(), Object.class);
            kafkaTemplate.send(record.topic(), record.eventId().toString(), payload)
                    .get(properties.sendTimeoutMs(), TimeUnit.MILLISECONDS);
            repository.markPublished(record.id());
        } catch (Exception ex) {
            int attempts = record.attempts() + 1;
            boolean deadLetter = attempts >= properties.maxAttempts();
            repository.markFailed(record.id(), attempts, statusFor(deadLetter), nextAttemptAt(attempts), message(ex));
            log.warn("outbox_publish_failed eventId={} topic={} attempts={} deadLetter={}",
                    record.eventId(), record.topic(), attempts, deadLetter);
        }
    }

    private String statusFor(boolean deadLetter) {
        return deadLetter ? OutboxStatus.DEAD_LETTER.name() : OutboxStatus.FAILED.name();
    }

    private Instant nextAttemptAt(int attempts) {
        long seconds = Math.min(
                properties.maxBackoffSeconds(),
                properties.initialBackoffSeconds() * (1L << Math.min(attempts - 1, 10))
        );
        return Instant.now().plus(Duration.ofSeconds(seconds));
    }

    private static String message(Exception ex) {
        Throwable cause = ex instanceof JsonProcessingException ? ex : ex.getCause();
        String message = cause == null ? ex.getMessage() : cause.getMessage();
        if (message == null || message.isBlank()) {
            return ex.getClass().getSimpleName();
        }
        return message.length() > 1000 ? message.substring(0, 1000) : message;
    }
}
