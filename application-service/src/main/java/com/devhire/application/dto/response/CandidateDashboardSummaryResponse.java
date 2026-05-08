package com.devhire.application.dto.response;

import java.util.List;

public record CandidateDashboardSummaryResponse(long applications,
                                                long activeApplications,
                                                long interviews,
                                                long offers,
                                                List<StatusCountResponse> statusDistribution,
                                                List<CandidateTimelineItemResponse> timeline) {
}
