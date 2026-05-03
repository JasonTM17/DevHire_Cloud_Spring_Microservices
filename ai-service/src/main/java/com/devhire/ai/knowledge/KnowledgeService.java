package com.devhire.ai.knowledge;

import com.devhire.ai.config.AiProperties;
import com.devhire.ai.dto.ReindexResponse;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class KnowledgeService {
    private final KnowledgeRepository repository;
    private final AiProperties properties;

    public KnowledgeService(KnowledgeRepository repository, AiProperties properties) {
        this.repository = repository;
        this.properties = properties;
    }

    @Transactional
    public ReindexResponse reindex() {
        List<KnowledgeDocument> documents = loadClasspathDocuments();
        repository.replaceAll(documents);
        return new ReindexResponse(documents.size(), repository.chunkCount());
    }

    @Transactional(readOnly = true)
    public List<KnowledgeChunk> retrieve(String question) {
        if (repository.chunkCount() == 0) {
            return List.of();
        }
        Set<String> terms = tokenize(question);
        return repository.findAllChunks().stream()
                .sorted(Comparator.comparingInt((KnowledgeChunk chunk) -> score(chunk, terms)).reversed())
                .filter(chunk -> score(chunk, terms) > 0)
                .limit(properties.getMaxContextChunks())
                .toList();
    }

    private List<KnowledgeDocument> loadClasspathDocuments() {
        try {
            Resource[] resources = new PathMatchingResourcePatternResolver()
                    .getResources("classpath:/knowledge/*.md");
            return java.util.Arrays.stream(resources)
                    .map(this::toDocument)
                    .toList();
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to load AI knowledge documents", ex);
        }
    }

    private KnowledgeDocument toDocument(Resource resource) {
        try {
            String filename = resource.getFilename() == null ? "knowledge.md" : resource.getFilename();
            String title = filename.replace(".md", "").replace('-', ' ');
            String content = resource.getContentAsString(StandardCharsets.UTF_8);
            return new KnowledgeDocument("DOC", "classpath:/knowledge/" + filename, title, content);
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to read AI knowledge resource", ex);
        }
    }

    private static int score(KnowledgeChunk chunk, Set<String> terms) {
        String content = chunk.content().toLowerCase(Locale.ROOT);
        int score = 0;
        for (String term : terms) {
            if (content.contains(term)) {
                score++;
            }
        }
        return score;
    }

    private static Set<String> tokenize(String value) {
        return java.util.Arrays.stream(value.toLowerCase(Locale.ROOT).split("[^a-z0-9]+"))
                .map(String::trim)
                .filter(token -> token.length() > 2)
                .collect(Collectors.toSet());
    }
}
