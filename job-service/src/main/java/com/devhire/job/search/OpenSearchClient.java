package com.devhire.job.search;

import java.util.Map;

public interface OpenSearchClient {
    void ensureJobIndex(String index);

    void index(String index, String id, Map<String, Object> document);

    void delete(String index, String id);

    OpenSearchSearchResult search(String index, Map<String, Object> request);
}
