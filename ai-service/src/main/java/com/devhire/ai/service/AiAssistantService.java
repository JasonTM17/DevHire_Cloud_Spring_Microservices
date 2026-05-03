package com.devhire.ai.service;

import com.devhire.ai.client.ClaudeChatClient;
import com.devhire.ai.config.AiProperties;
import com.devhire.ai.dto.AiChatRequest;
import com.devhire.ai.dto.AiChatResponse;
import com.devhire.ai.dto.AiCitation;
import com.devhire.ai.dto.AiConversationSummary;
import com.devhire.ai.dto.AiMessageResponse;
import com.devhire.ai.dto.AiToolTrace;
import com.devhire.ai.dto.ReindexResponse;
import com.devhire.ai.event.AiAuditEventPublisher;
import com.devhire.ai.knowledge.KnowledgeChunk;
import com.devhire.ai.knowledge.KnowledgeService;
import com.devhire.ai.repository.AiConversationRepository;
import com.devhire.ai.tool.JobSearchTool;
import com.devhire.ai.tool.PlatformHealthTool;
import com.devhire.common.error.ErrorCode;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AiAssistantService {
    private final AiProperties properties;
    private final ClaudeChatClient claudeClient;
    private final KnowledgeService knowledgeService;
    private final JobSearchTool jobSearchTool;
    private final PlatformHealthTool platformHealthTool;
    private final AiConversationRepository repository;
    private final AiAuditEventPublisher auditEventPublisher;
    private final MeterRegistry meterRegistry;

    public AiAssistantService(AiProperties properties,
                              ClaudeChatClient claudeClient,
                              KnowledgeService knowledgeService,
                              JobSearchTool jobSearchTool,
                              PlatformHealthTool platformHealthTool,
                              AiConversationRepository repository,
                              AiAuditEventPublisher auditEventPublisher,
                              MeterRegistry meterRegistry) {
        this.properties = properties;
        this.claudeClient = claudeClient;
        this.knowledgeService = knowledgeService;
        this.jobSearchTool = jobSearchTool;
        this.platformHealthTool = platformHealthTool;
        this.repository = repository;
        this.auditEventPublisher = auditEventPublisher;
        this.meterRegistry = meterRegistry;
    }

    @Transactional
    public AiChatResponse chat(AuthenticatedUser user, AiChatRequest request) {
        Instant startedAt = Instant.now();
        String model = properties.getAnthropic().getModel();
        UUID conversationId = repository.ensureConversation(request.conversationId(), user, title(request.message()), model);
        repository.saveMessage(conversationId, "USER", request.message(), false, List.of(), List.of());

        List<KnowledgeChunk> chunks = knowledgeService.retrieve(request.message());
        if (chunks.isEmpty()) {
            knowledgeService.reindex();
            chunks = knowledgeService.retrieve(request.message());
        }
        List<AiCitation> citations = chunks.stream().map(KnowledgeChunk::citation).collect(java.util.stream.Collectors.toCollection(ArrayList::new));

        JobSearchTool.ToolResult jobs = jobSearchTool.search(request.message());
        PlatformHealthTool.ToolResult health = platformHealthTool.snapshot();
        List<AiToolTrace> toolTraces = new ArrayList<>(List.of(jobs.trace(), health.trace()));
        toolTraces.forEach(trace -> recordToolExecution(user, conversationId, trace));

        String systemPrompt = systemPrompt();
        String userPrompt = userPrompt(request.message(), chunks, jobs.summary(), health.summary());
        boolean fallback = false;
        String answer;
        try {
            if (!claudeClient.enabled()) {
                throw new IllegalStateException("Claude Haiku API key is not configured");
            }
            answer = claudeClient.complete(systemPrompt, userPrompt);
        } catch (RuntimeException ex) {
            if (!properties.isDemoFallbackEnabled()) {
                throw ex;
            }
            fallback = true;
            answer = fallbackAnswer(request.message(), jobs.summary(), health.summary(), citations);
            meterRegistry.counter("devhire.ai.fallback.total").increment();
        }

        repository.saveMessage(conversationId, "ASSISTANT", answer, fallback, citations, toolTraces);
        long latencyMs = Duration.between(startedAt, Instant.now()).toMillis();
        repository.recordUsage(conversationId, user.id(), model, fallback, toolTraces.size(),
                userPrompt.length(), answer.length(), latencyMs);
        meterRegistry.counter("devhire.ai.chat.requests", "fallback", String.valueOf(fallback)).increment();
        meterRegistry.timer("devhire.ai.chat.latency").record(Duration.ofMillis(latencyMs));
        meterRegistry.summary("devhire.ai.token.estimate", "direction", "prompt").record(estimateTokens(userPrompt));
        meterRegistry.summary("devhire.ai.token.estimate", "direction", "answer").record(estimateTokens(answer));
        audit(user, fallback ? "AI_FALLBACK_USED" : "AI_CHAT_REQUESTED", conversationId,
                Map.of("model", model, "toolCount", toolTraces.size(), "fallback", fallback));
        return new AiChatResponse(conversationId, answer, citations, toolTraces, model, fallback, Instant.now());
    }

    @Transactional(readOnly = true)
    public List<AiConversationSummary> listConversations(AuthenticatedUser user) {
        return repository.listConversations(user.id());
    }

    @Transactional(readOnly = true)
    public List<AiMessageResponse> messages(AuthenticatedUser user, UUID conversationId) {
        return repository.findMessages(conversationId, user.id());
    }

    @Transactional
    public void deleteConversation(AuthenticatedUser user, UUID conversationId) {
        repository.deleteConversation(conversationId, user.id());
    }

    @Transactional
    public ReindexResponse reindex(AuthenticatedUser admin) {
        if (admin.role() != UserRole.ADMIN) {
            throw new DevHireException(ErrorCode.FORBIDDEN, "Required role: ADMIN");
        }
        ReindexResponse response = knowledgeService.reindex();
        audit(admin, "AI_KNOWLEDGE_REINDEXED", admin.id(), Map.of("documents", response.documents(), "chunks", response.chunks()));
        return response;
    }

    private void audit(AuthenticatedUser user, String action, UUID resourceId, Map<String, Object> metadata) {
        auditEventPublisher.publish(AuditEvent.now(user.id(), user.email(), user.role().name(), action,
                "AI", resourceId.toString(), metadata));
    }

    private void recordToolExecution(AuthenticatedUser user, UUID conversationId, AiToolTrace trace) {
        meterRegistry.counter("devhire.ai.tool.calls", "tool", trace.name(), "status", trace.status()).increment();
        audit(user, "AI_TOOL_EXECUTED", conversationId,
                Map.of("tool", trace.name(), "status", trace.status(), "summary", trace.summary()));
    }

    private static int estimateTokens(String value) {
        return Math.max(1, (int) Math.ceil(value.length() / 4.0));
    }

    private String systemPrompt() {
        return """
                You are DevHire Cloud's portfolio assistant. Answer like a senior Java backend and DevOps engineer.
                Stay inside the DevHire Cloud domain: microservices, recruiting workflows, architecture, operations, CI/CD, security, and demo guidance.
                Use provided context and cite facts with concise references. Do not invent secrets, credentials, cloud deployments, or production claims.
                """;
    }

    private String userPrompt(String message, List<KnowledgeChunk> chunks, String jobsSummary, String healthSummary) {
        StringBuilder builder = new StringBuilder();
        builder.append("User question:\n").append(message).append("\n\n");
        builder.append("Retrieved knowledge:\n");
        for (KnowledgeChunk chunk : chunks) {
            builder.append("- ").append(chunk.title()).append(" (").append(chunk.sourcePath()).append("): ")
                    .append(chunk.content()).append("\n");
        }
        builder.append("\nTool result search_jobs:\n").append(jobsSummary).append("\n");
        builder.append("\nTool result get_platform_health_snapshot:\n").append(healthSummary).append("\n");
        builder.append("\nReturn a practical answer with short bullets and mention relevant citations.");
        return builder.toString();
    }

    private String fallbackAnswer(String message, String jobsSummary, String healthSummary, List<AiCitation> citations) {
        StringBuilder answer = new StringBuilder();
        answer.append("Claude Haiku is not configured in this runtime, so DevHire is using deterministic portfolio fallback mode.\n\n");
        answer.append("For your question: ").append(message).append("\n\n");
        answer.append("- Job context: ").append(jobsSummary).append("\n");
        answer.append("- Platform context: ").append(healthSummary).append("\n");
        answer.append("- Production angle: DevHire demonstrates Gateway JWT validation, service-owned PostgreSQL databases, Kafka outbox, OpenSearch search, observability, CI/CD, Docker, Kubernetes, Terraform, and tested role workflows.\n");
        if (!citations.isEmpty()) {
            answer.append("- Citation: ").append(citations.getFirst().title()).append(" from ").append(citations.getFirst().sourcePath()).append("\n");
        }
        return answer.toString();
    }

    private static String title(String message) {
        String normalized = message.strip().replaceAll("\\s+", " ");
        return normalized.length() <= 80 ? normalized : normalized.substring(0, 80);
    }
}
