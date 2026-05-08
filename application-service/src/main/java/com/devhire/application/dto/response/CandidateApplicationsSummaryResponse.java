package com.devhire.application.dto.response;

import java.util.List;

public record CandidateApplicationsSummaryResponse(long totalApplications,
                                                   long duplicateProtectedJobs,
                                                   List<StatusCountResponse> statusDistribution,
                                                   List<CandidateTimelineItemResponse> recentActivity) {
}
