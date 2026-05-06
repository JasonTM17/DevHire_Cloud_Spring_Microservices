package com.devhire.ai.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record InterviewPrepResponse(UUID conversationId,
                                    String title,
                                    String model,
                                    boolean fallback,
                                    Instant lastMessageAt,
                                    List<String> focusAreas) {
}
