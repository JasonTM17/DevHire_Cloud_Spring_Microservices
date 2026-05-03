package com.devhire.ai.dto;

public record AiStreamEvent(
        String type,
        Object payload
) {
}
