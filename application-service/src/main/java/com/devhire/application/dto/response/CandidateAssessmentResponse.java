package com.devhire.application.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CandidateAssessmentResponse(UUID id,
                                          String title,
                                          String provider,
                                          int score,
                                          int maxScore,
                                          String status,
                                          List<String> skills,
                                          Instant completedAt) {
}
