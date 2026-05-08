package com.devhire.ai.dto;

import java.util.List;

public record CandidateRoadmapResponse(String title,
                                       String currentTrack,
                                       int readinessScore,
                                       List<RoadmapMilestoneResponse> milestones,
                                       List<String> recommendedPrompts) {
}
