package com.devhire.ai.client;

import com.devhire.ai.config.AiProperties;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

@Component
public class AnthropicClaudeClient implements ClaudeChatClient {
    private final AiProperties properties;
    private final WebClient.Builder webClientBuilder;

    public AnthropicClaudeClient(AiProperties properties, WebClient.Builder webClientBuilder) {
        this.properties = properties;
        this.webClientBuilder = webClientBuilder;
    }

    @Override
    public boolean enabled() {
        String apiKey = properties.getAnthropic().getApiKey();
        return apiKey != null && !apiKey.isBlank();
    }

    @Override
    public String complete(String systemPrompt, String userPrompt) {
        if (!enabled()) {
            throw new IllegalStateException("Anthropic API key is not configured");
        }
        var anthropic = properties.getAnthropic();
        AnthropicMessageResponse response = webClientBuilder
                .baseUrl(anthropic.getBaseUrl())
                .build()
                .post()
                .uri("/v1/messages")
                .header("x-api-key", anthropic.getApiKey())
                .header("anthropic-version", anthropic.getVersion())
                .bodyValue(new AnthropicMessageRequest(
                        anthropic.getModel(),
                        anthropic.getMaxTokens(),
                        systemPrompt,
                        List.of(new AnthropicMessage("user", userPrompt))
                ))
                .retrieve()
                .bodyToMono(AnthropicMessageResponse.class)
                .block();
        if (response == null || response.content() == null) {
            throw new IllegalStateException("Anthropic response was empty");
        }
        return response.content().stream()
                .filter(part -> "text".equals(part.type()))
                .map(AnthropicContent::text)
                .filter(text -> text != null && !text.isBlank())
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Anthropic response did not include text"));
    }

    record AnthropicMessageRequest(String model, int max_tokens, String system, List<AnthropicMessage> messages) {
    }

    record AnthropicMessage(String role, String content) {
    }

    record AnthropicMessageResponse(List<AnthropicContent> content) {
    }

    record AnthropicContent(String type, String text) {
    }
}
