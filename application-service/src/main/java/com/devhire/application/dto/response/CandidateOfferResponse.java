package com.devhire.application.dto.response;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CandidateOfferResponse(UUID id,
                                     UUID applicationId,
                                     String jobTitle,
                                     String companyName,
                                     String compensation,
                                     String status,
                                     List<String> highlights,
                                     Instant expiresAt,
                                     Instant createdAt) {
}
