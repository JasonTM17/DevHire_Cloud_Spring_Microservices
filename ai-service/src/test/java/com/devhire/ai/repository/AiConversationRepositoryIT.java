package com.devhire.ai.repository;

import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import com.devhire.ai.knowledge.KnowledgeRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jdbc.test.autoconfigure.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@JdbcTest
@Import({AiConversationRepository.class, KnowledgeRepository.class, ObjectMapper.class})
@Testcontainers(disabledWithoutDocker = true)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AiConversationRepositoryIT {
    @Container
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    @DynamicPropertySource
    static void datasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired
    private AiConversationRepository conversationRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void flywaySeedCreatesCitedFallbackConversationsAndUsageEvidence() {
        UUID candidateId = UUID.fromString("00000000-0000-0000-0000-000000000003");
        UUID conversationId = UUID.fromString("70000000-0000-0000-0001-000000000001");

        assertThat(count("ai_conversations")).isGreaterThanOrEqualTo(20);
        assertThat(count("ai_messages")).isGreaterThanOrEqualTo(40);
        assertThat(count("ai_usage_events")).isGreaterThanOrEqualTo(20);
        assertThat(conversationRepository.listConversations(candidateId)).isNotEmpty();

        var messages = conversationRepository.findMessages(conversationId, candidateId);
        assertThat(messages).hasSize(2);
        assertThat(messages.get(1).fallback()).isTrue();
        assertThat(messages.get(1).citations()).extracting("sourcePath")
                .contains("docs/architecture.md", "docs/REVIEW_EVIDENCE.md");
        assertThat(messages.get(1).toolTraces()).isNotEmpty();
    }

    @Test
    void recordUsagePersistsRuntimeAiMetricEvidence() {
        UUID candidateId = UUID.fromString("00000000-0000-0000-0000-000000000003");
        AuthenticatedUser user = new AuthenticatedUser(candidateId, "candidate@devhire.local", UserRole.CANDIDATE);
        UUID conversationId = conversationRepository.ensureConversation(null, user,
                "Integration usage evidence", "claude-haiku-4-5-20251001");

        long before = count("ai_usage_events");
        conversationRepository.recordUsage(conversationId, candidateId, "claude-haiku-4-5-20251001",
                true, 2, 120, 540, 300);

        assertThat(count("ai_usage_events")).isEqualTo(before + 1);
    }

    private long count(String table) {
        Long count = jdbcTemplate.queryForObject("SELECT count(*) FROM " + table, Long.class);
        return count == null ? 0 : count;
    }
}
