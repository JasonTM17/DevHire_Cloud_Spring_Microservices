package com.devhire.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record AiChatRequest(
        UUID conversationId,
        @NotBlank @Size(max = 2000) String message
) {
}
