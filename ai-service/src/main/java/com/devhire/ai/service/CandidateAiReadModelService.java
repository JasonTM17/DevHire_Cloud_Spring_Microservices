package com.devhire.ai.service;

import com.devhire.ai.dto.CandidateRoadmapResponse;
import com.devhire.ai.dto.InterviewPrepResponse;
import com.devhire.ai.dto.RoadmapMilestoneResponse;
import com.devhire.common.error.ErrorCode;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class CandidateAiReadModelService {
    private final JdbcTemplate jdbcTemplate;

    public CandidateAiReadModelService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public CandidateRoadmapResponse roadmap(AuthenticatedUser user) {
        requireCandidate(user);
        Long conversations = jdbcTemplate.queryForObject("""
                SELECT count(*) FROM ai_conversations WHERE user_id = ?
                """, Long.class, user.id());
        int readiness = Math.min(96, 68 + (int) Math.min(20, conversations == null ? 0 : conversations));
        return new CandidateRoadmapResponse(
                "Cloud Backend Career Roadmap",
                "Java microservices, Kafka, AWS, observability",
                readiness,
                List.of(
                        new RoadmapMilestoneResponse("Production Java foundation", "COMPLETED",
                                "Spring Boot, JPA, validation, security, and test coverage are visible in portfolio services.",
                                "Keep examples concise and explain tradeoffs in interviews."),
                        new RoadmapMilestoneResponse("Event reliability", "IN_PROGRESS",
                                "Kafka, transactional outbox, retry, and idempotent consumers are implemented.",
                                "Prepare a failure-mode story around duplicate events and replay."),
                        new RoadmapMilestoneResponse("Cloud readiness", "IN_PROGRESS",
                                "AWS Terraform, Helm, External Secrets, and GitOps are apply-ready blueprint evidence.",
                                "Practice the first-apply checklist and rollback narrative."),
                        new RoadmapMilestoneResponse("SLO operations", "NEXT",
                                "Prometheus/Grafana dashboards and runbooks connect runtime signals to business workflows.",
                                "Use domain metrics to explain production ownership.")),
                List.of(
                        "Explain my Java microservices portfolio to a principal engineer",
                        "Create a STAR answer for Kafka outbox reliability",
                        "Quiz me on AWS EKS, RDS, Redis, MSK, and OpenSearch tradeoffs"));
    }

    @Transactional(readOnly = true)
    public List<InterviewPrepResponse> interviewPrep(AuthenticatedUser user) {
        requireCandidate(user);
        return jdbcTemplate.query("""
                SELECT c.id, c.title, c.model, c.last_message_at,
                       coalesce(bool_or(m.fallback), false) AS fallback
                FROM ai_conversations c
                LEFT JOIN ai_messages m ON m.conversation_id = c.id AND m.role = 'ASSISTANT'
                WHERE c.user_id = ?
                GROUP BY c.id, c.title, c.model, c.last_message_at
                ORDER BY c.last_message_at DESC
                LIMIT 8
                """, (rs, rowNum) -> new InterviewPrepResponse(
                rs.getObject("id", UUID.class),
                rs.getString("title"),
                rs.getString("model"),
                rs.getBoolean("fallback"),
                instant(rs.getTimestamp("last_message_at")),
                focusAreas(rs.getString("title"))), user.id());
    }

    private static List<String> focusAreas(String title) {
        String normalized = title == null ? "" : title.toLowerCase();
        if (normalized.contains("cloud")) {
            return List.of("AWS blueprint", "Terraform guardrails", "rollback path");
        }
        if (normalized.contains("java") || normalized.contains("job")) {
            return List.of("Spring Boot services", "Kafka events", "OpenSearch search");
        }
        if (normalized.contains("safety")) {
            return List.of("Prompt injection", "fallback behavior", "citation policy");
        }
        return List.of("Architecture narrative", "runtime evidence", "reviewer demo path");
    }

    private static Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    private static void requireCandidate(AuthenticatedUser user) {
        if (user.role() != UserRole.CANDIDATE) {
            throw new DevHireException(ErrorCode.FORBIDDEN, "Required role: CANDIDATE");
        }
    }
}
