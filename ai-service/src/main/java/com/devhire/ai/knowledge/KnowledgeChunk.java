package com.devhire.ai.knowledge;

import com.devhire.ai.dto.AiCitation;

import java.util.UUID;

public record KnowledgeChunk(
        UUID id,
        String title,
        String sourceType,
        String sourcePath,
        String content
) {
    public AiCitation citation() {
        String snippet = content.length() > 260 ? content.substring(0, 260) + "..." : content;
        return new AiCitation(title, sourceType, sourcePath, snippet);
    }
}
