package com.devhire.ai.repository;

import com.devhire.ai.dto.AiCitation;
import com.devhire.ai.dto.AiConversationSummary;
import com.devhire.ai.dto.AiMessageResponse;
import com.devhire.ai.dto.AiToolTrace;
import com.devhire.common.security.AuthenticatedUser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public class AiConversationRepository {
    private static final TypeReference<List<AiCitation>> CITATION_LIST = new TypeReference<>() {
    };
    private static final TypeReference<List<AiToolTrace>> TOOL_TRACE_LIST = new TypeReference<>() {
    };

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AiConversationRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public UUID ensureConversation(UUID requestedId, AuthenticatedUser user, String title, String model) {
        if (requestedId != null && ownsConversation(requestedId, user.id())) {
            return requestedId;
        }
        UUID id = requestedId == null ? UUID.randomUUID() : requestedId;
        jdbcTemplate.update("""
                INSERT INTO ai_conversations(id, user_id, user_email, user_role, title, model, created_at, updated_at, last_message_at)
                VALUES (?, ?, ?, ?, ?, ?, now(), now(), now())
                """, id, user.id(), user.email(), user.role().name(), title, model);
        return id;
    }

    public void saveMessage(UUID conversationId, String role, String content, boolean fallback,
                            List<AiCitation> citations, List<AiToolTrace> toolTraces) {
        jdbcTemplate.update("""
                INSERT INTO ai_messages(id, conversation_id, role, content, fallback, citations, tool_traces, created_at)
                VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb), CAST(? AS jsonb), now())
                """, UUID.randomUUID(), conversationId, role, content, fallback, json(citations), json(toolTraces));
        jdbcTemplate.update("""
                UPDATE ai_conversations
                SET updated_at = now(), last_message_at = now()
                WHERE id = ?
                """, conversationId);
    }

    public List<AiConversationSummary> listConversations(UUID userId) {
        return jdbcTemplate.query("""
                SELECT id, title, model, updated_at, last_message_at
                FROM ai_conversations
                WHERE user_id = ?
                ORDER BY updated_at DESC
                """, (rs, rowNum) -> new AiConversationSummary(
                rs.getObject("id", UUID.class),
                rs.getString("title"),
                rs.getString("model"),
                rs.getTimestamp("updated_at").toInstant(),
                rs.getTimestamp("last_message_at").toInstant()
        ), userId);
    }

    public List<AiMessageResponse> findMessages(UUID conversationId, UUID userId) {
        if (!ownsConversation(conversationId, userId)) {
            return List.of();
        }
        return jdbcTemplate.query("""
                SELECT id, role, content, fallback, citations::text AS citations, tool_traces::text AS tool_traces, created_at
                FROM ai_messages
                WHERE conversation_id = ?
                ORDER BY created_at ASC
                """, (rs, rowNum) -> new AiMessageResponse(
                rs.getObject("id", UUID.class),
                rs.getString("role"),
                rs.getString("content"),
                rs.getBoolean("fallback"),
                read(rs.getString("citations"), CITATION_LIST),
                read(rs.getString("tool_traces"), TOOL_TRACE_LIST),
                rs.getTimestamp("created_at").toInstant()
        ), conversationId);
    }

    public void deleteConversation(UUID conversationId, UUID userId) {
        jdbcTemplate.update("DELETE FROM ai_conversations WHERE id = ? AND user_id = ?", conversationId, userId);
    }

    public void recordUsage(UUID conversationId, UUID userId, String model, boolean fallback, int toolCount,
                            int promptChars, int answerChars, long latencyMs) {
        jdbcTemplate.update("""
                INSERT INTO ai_usage_events(id, conversation_id, user_id, model, fallback, tool_count, prompt_chars, answer_chars, latency_ms, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, UUID.randomUUID(), conversationId, userId, model, fallback, toolCount,
                promptChars, answerChars, latencyMs, java.sql.Timestamp.from(Instant.now()));
    }

    private boolean ownsConversation(UUID conversationId, UUID userId) {
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM ai_conversations WHERE id = ? AND user_id = ?)
                """, Boolean.class, conversationId, userId);
        return Boolean.TRUE.equals(exists);
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("AI metadata cannot be serialized", ex);
        }
    }

    private <T> T read(String value, TypeReference<T> type) {
        try {
            return objectMapper.readValue(value, type);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("AI metadata cannot be read", ex);
        }
    }
}
