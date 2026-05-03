package com.devhire.ai.tool;

import com.devhire.ai.dto.AiToolTrace;
import org.springframework.stereotype.Component;

@Component
public class PlatformHealthTool {
    public ToolResult snapshot() {
        String summary = "Gateway, PostgreSQL, Redis, Kafka, OpenSearch, Prometheus, Grafana, Loki, Tempo, and services are represented in Docker Compose with actuator health probes.";
        return new ToolResult("get_platform_health_snapshot", summary,
                new AiToolTrace("get_platform_health_snapshot", "OK", "Static portfolio health topology added to context"));
    }

    public record ToolResult(String name, String summary, AiToolTrace trace) {
    }
}
