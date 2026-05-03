package com.devhire.ai.knowledge;

public record KnowledgeDocument(
        String sourceType,
        String sourcePath,
        String title,
        String content
) {
}
