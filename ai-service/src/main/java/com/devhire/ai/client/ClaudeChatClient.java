package com.devhire.ai.client;

public interface ClaudeChatClient {
    boolean enabled();

    String complete(String systemPrompt, String userPrompt);
}
