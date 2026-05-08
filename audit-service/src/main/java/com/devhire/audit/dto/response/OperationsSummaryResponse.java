package com.devhire.audit.dto.response;

import java.time.Instant;
import java.util.List;

public record OperationsSummaryResponse(long auditEvents,
                                        long distinctActors,
                                        Instant latestEventAt,
                                        List<ActionCountResponse> topActions,
                                        List<ActionCountResponse> actorRoles) {
}
