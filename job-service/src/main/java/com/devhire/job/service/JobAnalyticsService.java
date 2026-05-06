package com.devhire.job.service;

import com.devhire.job.dto.response.LevelDemandResponse;
import com.devhire.job.dto.response.LocationDemandResponse;
import com.devhire.job.dto.response.SkillAnalyticsResponse;
import com.devhire.job.dto.response.SkillDemandResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class JobAnalyticsService {
    private final JdbcTemplate jdbcTemplate;

    public JobAnalyticsService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public SkillAnalyticsResponse candidateSkillAnalytics() {
        Long publishedJobs = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM jobs WHERE status = 'PUBLISHED'", Long.class);
        Long averageMin = jdbcTemplate.queryForObject("""
                SELECT coalesce(avg(salary_min), 0)::bigint FROM jobs WHERE status = 'PUBLISHED'
                """, Long.class);
        Long averageMax = jdbcTemplate.queryForObject("""
                SELECT coalesce(avg(salary_max), 0)::bigint FROM jobs WHERE status = 'PUBLISHED'
                """, Long.class);
        return new SkillAnalyticsResponse(
                value(publishedJobs),
                value(averageMin),
                value(averageMax),
                topSkills(),
                topLocations(),
                levelDistribution());
    }

    private List<SkillDemandResponse> topSkills() {
        return jdbcTemplate.query("""
                SELECT trim(s.skill) AS skill, count(*) AS jobs
                FROM jobs
                CROSS JOIN regexp_split_to_table(coalesce(skills_csv, ''), ',') AS s(skill)
                WHERE status = 'PUBLISHED' AND trim(s.skill) <> ''
                GROUP BY trim(s.skill)
                ORDER BY jobs DESC, skill
                LIMIT 10
                """, (rs, rowNum) -> new SkillDemandResponse(rs.getString("skill"), rs.getLong("jobs")));
    }

    private List<LocationDemandResponse> topLocations() {
        return jdbcTemplate.query("""
                SELECT coalesce(location, 'Remote') AS location, count(*) AS jobs
                FROM jobs
                WHERE status = 'PUBLISHED'
                GROUP BY coalesce(location, 'Remote')
                ORDER BY jobs DESC, location
                LIMIT 8
                """, (rs, rowNum) -> new LocationDemandResponse(rs.getString("location"), rs.getLong("jobs")));
    }

    private List<LevelDemandResponse> levelDistribution() {
        return jdbcTemplate.query("""
                SELECT coalesce(level, 'Any level') AS level, count(*) AS jobs
                FROM jobs
                WHERE status = 'PUBLISHED'
                GROUP BY coalesce(level, 'Any level')
                ORDER BY jobs DESC, level
                """, (rs, rowNum) -> new LevelDemandResponse(rs.getString("level"), rs.getLong("jobs")));
    }

    private static long value(Long value) {
        return value == null ? 0 : value;
    }
}
