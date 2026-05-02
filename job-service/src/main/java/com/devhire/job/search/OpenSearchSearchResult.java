package com.devhire.job.search;

import java.util.List;

public record OpenSearchSearchResult(List<OpenSearchHit> hits, long total) {
}
