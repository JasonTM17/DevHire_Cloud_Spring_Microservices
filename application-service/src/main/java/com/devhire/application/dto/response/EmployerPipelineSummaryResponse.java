package com.devhire.application.dto.response;

import java.util.List;

public record EmployerPipelineSummaryResponse(long totalApplications,
                                              long activeCandidates,
                                              long interviewReady,
                                              long offers,
                                              List<StatusCountResponse> statusDistribution,
                                              List<CandidateTimelineItemResponse> recentActivity) {
}
