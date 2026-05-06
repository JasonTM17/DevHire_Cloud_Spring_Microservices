package com.devhire.job.dto.response;

import java.util.List;

public record SkillAnalyticsResponse(long publishedJobs,
                                     long averageSalaryMin,
                                     long averageSalaryMax,
                                     List<SkillDemandResponse> topSkills,
                                     List<LocationDemandResponse> topLocations,
                                     List<LevelDemandResponse> levelDistribution) {
}
