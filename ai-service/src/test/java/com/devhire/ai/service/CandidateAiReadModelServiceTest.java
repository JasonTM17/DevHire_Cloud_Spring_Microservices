package com.devhire.ai.service;

import com.devhire.ai.dto.InterviewPrepResponse;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CandidateAiReadModelServiceTest {
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final CandidateAiReadModelService service = new CandidateAiReadModelService(jdbcTemplate);
    private final UUID candidateId = UUID.randomUUID();

    @Test
    void roadmapUsesConversationVolumeForReadinessAndPromptPlan() {
        when(jdbcTemplate.queryForObject(contains("count(*) FROM ai_conversations"), eq(Long.class), eq(candidateId)))
                .thenReturn(14L);

        var roadmap = service.roadmap(candidate());

        assertThat(roadmap.readinessScore()).isEqualTo(82);
        assertThat(roadmap.milestones()).hasSize(4);
        assertThat(roadmap.recommendedPrompts()).anyMatch(prompt -> prompt.contains("Kafka"));
    }

    @Test
    void roadmapCapsReadinessScoreForHeavyUsage() {
        when(jdbcTemplate.queryForObject(contains("count(*) FROM ai_conversations"), eq(Long.class), eq(candidateId)))
                .thenReturn(100L);

        assertThat(service.roadmap(candidate()).readinessScore()).isEqualTo(88);
    }

    @Test
    void interviewPrepMapsFallbackAndFocusAreas() throws Exception {
        UUID conversationId = UUID.randomUUID();
        when(jdbcTemplate.query(contains("FROM ai_conversations"), any(RowMapper.class), eq(candidateId)))
                .thenAnswer(invocation -> List.of(interviewPrep(invocation.getArgument(1), conversationId)));

        var sessions = service.interviewPrep(candidate());

        assertThat(sessions).extracting(InterviewPrepResponse::conversationId).containsExactly(conversationId);
        assertThat(sessions.getFirst().focusAreas()).containsExactly("AWS blueprint", "Terraform guardrails", "rollback path");
    }

    @Test
    void candidateAiReadModelsRejectWrongRole() {
        AuthenticatedUser admin = new AuthenticatedUser(UUID.randomUUID(), "admin@devhire.local", UserRole.ADMIN);

        assertThatThrownBy(() -> service.roadmap(admin))
                .isInstanceOf(DevHireException.class)
                .hasMessageContaining("Required role: CANDIDATE");
    }

    private static InterviewPrepResponse interviewPrep(RowMapper<InterviewPrepResponse> mapper, UUID conversationId) throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getObject("id", UUID.class)).thenReturn(conversationId);
        when(rs.getString("title")).thenReturn("Cloud architecture interview");
        when(rs.getString("model")).thenReturn("claude-haiku-4-5-20251001");
        when(rs.getBoolean("fallback")).thenReturn(false);
        when(rs.getTimestamp("last_message_at")).thenReturn(Timestamp.from(Instant.parse("2026-05-05T12:00:00Z")));
        return mapper.mapRow(rs, 0);
    }

    private AuthenticatedUser candidate() {
        return new AuthenticatedUser(candidateId, "candidate@devhire.local", UserRole.CANDIDATE);
    }
}
