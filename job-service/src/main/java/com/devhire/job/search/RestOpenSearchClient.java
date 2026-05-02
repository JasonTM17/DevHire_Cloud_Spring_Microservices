package com.devhire.job.search;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@ConditionalOnProperty(prefix = "devhire.search", name = "provider", havingValue = "opensearch")
public class RestOpenSearchClient implements OpenSearchClient {
    private static final Logger log = LoggerFactory.getLogger(RestOpenSearchClient.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP_TYPE = new ParameterizedTypeReference<>() {
    };

    private final RestClient restClient;

    public RestOpenSearchClient(RestClient openSearchRestClient) {
        this.restClient = openSearchRestClient;
    }

    @Override
    public void ensureJobIndex(String index) {
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("id", Map.of("type", "keyword"));
        fields.put("companyId", Map.of("type", "keyword"));
        fields.put("employerId", Map.of("type", "keyword"));
        fields.put("title", Map.of("type", "text", "analyzer", "devhire_text", "fields", Map.of("keyword", Map.of("type", "keyword"))));
        fields.put("description", Map.of("type", "text", "analyzer", "devhire_text"));
        fields.put("requirements", Map.of("type", "text", "analyzer", "devhire_text"));
        fields.put("benefits", Map.of("type", "text", "analyzer", "devhire_text"));
        fields.put("location", Map.of("type", "text", "fields", Map.of("keyword", Map.of("type", "keyword"))));
        fields.put("level", Map.of("type", "keyword"));
        fields.put("type", Map.of("type", "keyword"));
        fields.put("skills", Map.of("type", "keyword"));
        fields.put("status", Map.of("type", "keyword"));
        fields.put("salaryMin", Map.of("type", "double"));
        fields.put("salaryMax", Map.of("type", "double"));
        fields.put("publishedAt", Map.of("type", "date"));
        fields.put("createdAt", Map.of("type", "date"));

        Map<String, Object> mappings = Map.of(
                "settings", Map.of(
                        "analysis", Map.of(
                                "analyzer", Map.of(
                                        "devhire_text", Map.of("type", "standard")
                                )
                        )
                ),
                "mappings", Map.of("properties", fields)
        );
        try {
            restClient.put().uri("/{index}", index).body(mappings).retrieve().toBodilessEntity();
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 400 && ex.getResponseBodyAsString().contains("resource_already_exists_exception")) {
                log.debug("opensearch_index_already_exists index={}", index);
                return;
            }
            throw ex;
        }
    }

    @Override
    public void index(String index, String id, Map<String, Object> document) {
        restClient.put()
                .uri("/{index}/_doc/{id}?refresh=false", index, id)
                .body(document)
                .retrieve()
                .toBodilessEntity();
    }

    @Override
    public void delete(String index, String id) {
        try {
            restClient.delete()
                    .uri("/{index}/_doc/{id}?refresh=false", index, id)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() != 404) {
                throw ex;
            }
        }
    }

    @Override
    public OpenSearchSearchResult search(String index, Map<String, Object> request) {
        Map<String, Object> response = restClient.post()
                .uri("/{index}/_search", index)
                .body(request)
                .retrieve()
                .body(MAP_TYPE);
        return parse(response);
    }

    @SuppressWarnings("unchecked")
    private static OpenSearchSearchResult parse(Map<String, Object> response) {
        if (response == null) {
            return new OpenSearchSearchResult(List.of(), 0);
        }
        Map<String, Object> hitsContainer = (Map<String, Object>) response.getOrDefault("hits", Map.of());
        long total = total(hitsContainer.get("total"));
        List<Map<String, Object>> rawHits = (List<Map<String, Object>>) hitsContainer.getOrDefault("hits", List.of());
        List<OpenSearchHit> hits = new java.util.ArrayList<>();
        for (Map<String, Object> rawHit : rawHits) {
            Object id = rawHit.get("_id");
            if (id != null) {
                hits.add(new OpenSearchHit(String.valueOf(id)));
            }
        }
        return new OpenSearchSearchResult(hits, total);
    }

    @SuppressWarnings("unchecked")
    private static long total(Object total) {
        if (total instanceof Number number) {
            return number.longValue();
        }
        if (total instanceof Map<?, ?> map) {
            Object value = ((Map<String, Object>) map).get("value");
            return value instanceof Number number ? number.longValue() : 0;
        }
        return 0;
    }
}
