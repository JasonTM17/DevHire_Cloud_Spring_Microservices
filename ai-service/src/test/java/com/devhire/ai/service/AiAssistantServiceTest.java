package com.devhire.ai.service;

import com.devhire.ai.client.ClaudeChatClient;
import com.devhire.ai.config.AiProperties;
import com.devhire.ai.dto.AiChatRequest;
import com.devhire.ai.event.AiAuditEventPublisher;
import com.devhire.ai.knowledge.KnowledgeChunk;
import com.devhire.ai.knowledge.KnowledgeService;
import com.devhire.ai.repository.AiConversationRepository;
import com.devhire.ai.tool.JobSearchTool;
import com.devhire.ai.tool.PlatformHealthTool;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiAssistantServiceTest {
    private final AiProperties properties = new AiProperties();
    private final ClaudeChatClient claudeChatClient = mock(ClaudeChatClient.class);
    private final KnowledgeService knowledgeService = mock(KnowledgeService.class);
    private final JobSearchTool jobSearchTool = mock(JobSearchTool.class);
    private final PlatformHealthTool platformHealthTool = mock(PlatformHealthTool.class);
    private final AiConversationRepository repository = mock(AiConversationRepository.class);
    private final AiAuditEventPublisher auditEventPublisher = mock(AiAuditEventPublisher.class);
    private final AiAssistantService service = new AiAssistantService(properties, claudeChatClient, knowledgeService,
            jobSearchTool, platformHealthTool, repository, auditEventPublisher, new SimpleMeterRegistry());

    @Test
    void usesClaudeWhenConfigured() {
        UUID conversationId = UUID.randomUUID();
        when(repository.ensureConversation(any(), any(), anyString(), anyString())).thenReturn(conversationId);
        when(knowledgeService.retrieve(anyString())).thenReturn(List.of(chunk()));
        when(jobSearchTool.search(anyString())).thenReturn(new JobSearchTool.ToolResult("search_jobs", "Senior Java", nullTrace("search_jobs")));
        when(platformHealthTool.snapshot()).thenReturn(new PlatformHealthTool.ToolResult("health", "All represented", nullTrace("health")));
        when(claudeChatClient.enabled()).thenReturn(true);
        when(claudeChatClient.complete(anyString(), anyString())).thenReturn("Claude answer with citations.");

        var response = service.chat(user(), new AiChatRequest(null, "Explain the platform"));

        assertThat(response.fallback()).isFalse();
        assertThat(response.answer()).contains("Claude answer");
        assertThat(response.citations()).hasSize(1);
        verify(repository).recordUsage(eq(conversationId), any(), anyString(), eq(false), anyInt(), anyInt(), anyInt(), anyLong());
        verify(knowledgeService, never()).reindex();
    }

    @Test
    void fallsBackWhenClaudeIsNotConfigured() {
        UUID conversationId = UUID.randomUUID();
        when(repository.ensureConversation(any(), any(), anyString(), anyString())).thenReturn(conversationId);
        when(knowledgeService.retrieve(anyString())).thenReturn(List.of(chunk()));
        when(jobSearchTool.search(anyString())).thenReturn(new JobSearchTool.ToolResult("search_jobs", "No matching jobs", nullTrace("search_jobs")));
        when(platformHealthTool.snapshot()).thenReturn(new PlatformHealthTool.ToolResult("health", "Compose health", nullTrace("health")));
        when(claudeChatClient.enabled()).thenReturn(false);

        var response = service.chat(user(), new AiChatRequest(null, "Find Java jobs"));

        assertThat(response.fallback()).isTrue();
        assertThat(response.answer()).contains("deterministic portfolio fallback");
        verify(repository).saveMessage(eq(conversationId), eq("ASSISTANT"), anyString(), eq(true), anyList(), anyList());
    }

    private static AuthenticatedUser user() {
        return new AuthenticatedUser(UUID.randomUUID(), "candidate@devhire.local", UserRole.CANDIDATE);
    }

    private static KnowledgeChunk chunk() {
        return new KnowledgeChunk(UUID.randomUUID(), "Platform", "DOC", "classpath:/knowledge/platform.md",
                "DevHire uses Spring Boot microservices, Kafka outbox, OpenSearch, and observability.");
    }

    private static com.devhire.ai.dto.AiToolTrace nullTrace(String name) {
        return new com.devhire.ai.dto.AiToolTrace(name, "OK", "ok");
    }
}
