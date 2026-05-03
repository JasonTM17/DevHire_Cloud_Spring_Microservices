package com.devhire.common.outbox;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class OutboxEventRepository {
    private static final RowMapper<OutboxEventRecord> ROW_MAPPER = OutboxEventRepository::mapRow;

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedParameterJdbcTemplate;

    public OutboxEventRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.namedParameterJdbcTemplate = new NamedParameterJdbcTemplate(jdbcTemplate);
    }

    public void insert(UUID eventId,
                       String topic,
                       String aggregateType,
                       UUID aggregateId,
                       String eventType,
                       String payload) {
        namedParameterJdbcTemplate.update("""
                INSERT INTO outbox_events (
                    event_id, topic, aggregate_type, aggregate_id, event_type, payload,
                    status, attempts, next_attempt_at, created_at, updated_at
                )
                VALUES (
                    :eventId, :topic, :aggregateType, :aggregateId, :eventType, CAST(:payload AS jsonb),
                    :status, 0, now(), now(), now()
                )
                """, new MapSqlParameterSource()
                .addValue("eventId", eventId)
                .addValue("topic", topic)
                .addValue("aggregateType", aggregateType)
                .addValue("aggregateId", aggregateId)
                .addValue("eventType", eventType)
                .addValue("payload", payload)
                .addValue("status", OutboxStatus.PENDING.name()));
    }

    public List<OutboxEventRecord> findPublishable(int limit) {
        return jdbcTemplate.query("""
                SELECT id, event_id, topic, aggregate_type, aggregate_id, event_type, payload::text AS payload, attempts
                FROM outbox_events
                WHERE status IN ('PENDING', 'FAILED')
                  AND next_attempt_at <= now()
                ORDER BY created_at, id
                LIMIT ?
                FOR UPDATE SKIP LOCKED
                """, ROW_MAPPER, limit);
    }

    public void markPublished(long id) {
        jdbcTemplate.update("""
                UPDATE outbox_events
                SET status = ?, published_at = now(), updated_at = now(), last_error = NULL
                WHERE id = ?
                """, OutboxStatus.PUBLISHED.name(), id);
    }

    public void markFailed(long id, int attempts, String status, Instant nextAttemptAt, String error) {
        jdbcTemplate.update("""
                UPDATE outbox_events
                SET status = ?, attempts = ?, next_attempt_at = ?, last_error = ?, updated_at = now()
                WHERE id = ?
                """, status, attempts, Timestamp.from(nextAttemptAt), error, id);
    }

    private static OutboxEventRecord mapRow(ResultSet resultSet, int rowNum) throws SQLException {
        return new OutboxEventRecord(
                resultSet.getLong("id"),
                resultSet.getObject("event_id", UUID.class),
                resultSet.getString("topic"),
                resultSet.getString("aggregate_type"),
                resultSet.getObject("aggregate_id", UUID.class),
                resultSet.getString("event_type"),
                resultSet.getString("payload"),
                resultSet.getInt("attempts")
        );
    }
}
