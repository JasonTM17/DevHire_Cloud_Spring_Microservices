package com.devhire.ai.tool;

import com.devhire.ai.config.AiProperties;
import com.devhire.ai.dto.AiToolTrace;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Component
public class JobSearchTool {
    private final WebClient webClient;

    public JobSearchTool(AiProperties properties, WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.baseUrl(properties.getJobServiceUrl()).build();
    }

    public ToolResult search(String query) {
        try {
            Map<?, ?> envelope = webClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/jobs")
                            .queryParam("keyword", query)
                            .queryParam("page", 0)
                            .queryParam("size", 5)
                            .build())
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
            String summary = summarize(envelope);
            return new ToolResult("search_jobs", summary, new AiToolTrace("search_jobs", "OK", summary));
        } catch (RuntimeException ex) {
            return new ToolResult("search_jobs", "Job search tool unavailable: " + ex.getClass().getSimpleName(),
                    new AiToolTrace("search_jobs", "FALLBACK", "Job service was unavailable during AI context build"));
        }
    }

    private static String summarize(Map<?, ?> envelope) {
        if (envelope == null || !(envelope.get("data") instanceof Map<?, ?> data)
                || !(data.get("content") instanceof List<?> jobs) || jobs.isEmpty()) {
            return "No matching published jobs were returned by job-service.";
        }
        return jobs.stream()
                .filter(Map.class::isInstance)
                .map(Map.class::cast)
                .limit(5)
                .map(job -> "%s in %s, level %s".formatted(job.get("title"), job.get("location"), job.get("level")))
                .reduce((left, right) -> left + "; " + right)
                .orElse("No matching published jobs were returned by job-service.");
    }

    public record ToolResult(String name, String summary, AiToolTrace trace) {
    }
}
