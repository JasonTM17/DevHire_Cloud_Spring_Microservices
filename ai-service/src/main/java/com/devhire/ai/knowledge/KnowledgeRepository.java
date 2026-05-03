package com.devhire.ai.knowledge;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Repository
public class KnowledgeRepository {
    private final JdbcTemplate jdbcTemplate;

    public KnowledgeRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public int chunkCount() {
        Integer count = jdbcTemplate.queryForObject("SELECT count(*) FROM ai_knowledge_chunks", Integer.class);
        return count == null ? 0 : count;
    }

    public void replaceAll(List<KnowledgeDocument> documents) {
        jdbcTemplate.update("DELETE FROM ai_knowledge_documents");
        for (KnowledgeDocument document : documents) {
            UUID documentId = UUID.randomUUID();
            jdbcTemplate.update("""
                    INSERT INTO ai_knowledge_documents(id, source_type, source_path, title, content_hash, updated_at)
                    VALUES (?, ?, ?, ?, ?, now())
                    """, documentId, document.sourceType(), document.sourcePath(), document.title(), sha256(document.content()));
            List<String> chunks = chunk(document.content());
            for (int index = 0; index < chunks.size(); index++) {
                jdbcTemplate.update("""
                        INSERT INTO ai_knowledge_chunks(id, document_id, chunk_index, content, created_at)
                        VALUES (?, ?, ?, ?, now())
                        """, UUID.randomUUID(), documentId, index, chunks.get(index));
            }
        }
    }

    public List<KnowledgeChunk> findAllChunks() {
        return jdbcTemplate.query("""
                SELECT c.id, d.title, d.source_type, d.source_path, c.content
                FROM ai_knowledge_chunks c
                JOIN ai_knowledge_documents d ON d.id = c.document_id
                """, (rs, rowNum) -> new KnowledgeChunk(
                rs.getObject("id", UUID.class),
                rs.getString("title"),
                rs.getString("source_type"),
                rs.getString("source_path"),
                rs.getString("content")
        ));
    }

    private static List<String> chunk(String content) {
        String[] paragraphs = content.split("\\R\\s*\\R");
        return java.util.Arrays.stream(paragraphs)
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 unavailable", ex);
        }
    }
}
