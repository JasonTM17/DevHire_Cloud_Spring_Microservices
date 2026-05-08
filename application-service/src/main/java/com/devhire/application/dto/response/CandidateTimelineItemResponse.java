package com.devhire.application.dto.response;

import java.time.Instant;
import java.util.UUID;

public record CandidateTimelineItemResponse(UUID applicationId,
                                            String title,
                                            String status,
                                            String description,
                                            Instant occurredAt) {
}
