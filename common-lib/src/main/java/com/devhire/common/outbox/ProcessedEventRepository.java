package com.devhire.common.outbox;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

public class ProcessedEventRepository {
    private final JdbcTemplate jdbcTemplate;

    public ProcessedEventRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public boolean markProcessed(UUID eventId, String consumerName) {
        if (eventId == null) {
            return true;
        }
        try {
            jdbcTemplate.update("""
                    INSERT INTO processed_events (event_id, consumer_name, processed_at)
                    VALUES (?, ?, now())
                    """, eventId, consumerName);
            return true;
        } catch (DuplicateKeyException ex) {
            return false;
        }
    }

    public void deleteProcessed(UUID eventId, String consumerName) {
        if (eventId == null) {
            return;
        }
        jdbcTemplate.update("""
                DELETE FROM processed_events
                WHERE event_id = ? AND consumer_name = ?
                """, eventId, consumerName);
    }
}
