package com.devhire.job.service;

import com.devhire.job.dto.response.LevelDemandResponse;
import com.devhire.job.dto.response.LocationDemandResponse;
import com.devhire.job.dto.response.SkillDemandResponse;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JobAnalyticsServiceTest {
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final JobAnalyticsService service = new JobAnalyticsService(jdbcTemplate);

    @Test
    void candidateSkillAnalyticsMapsDemandDistribution() throws Exception {
        when(jdbcTemplate.queryForObject(eq("SELECT count(*) FROM jobs WHERE status = 'PUBLISHED'"), eq(Long.class)))
                .thenReturn(150L);
        when(jdbcTemplate.queryForObject(contains("avg(salary_min)"), eq(Long.class))).thenReturn(4200L);
        when(jdbcTemplate.queryForObject(contains("avg(salary_max)"), eq(Long.class))).thenReturn(7200L);
        when(jdbcTemplate.query(contains("regexp_split_to_table"), any(RowMapper.class)))
                .thenAnswer(invocation -> List.of(skill(invocation.getArgument(1))));
        when(jdbcTemplate.query(contains("GROUP BY coalesce(location"), any(RowMapper.class)))
                .thenAnswer(invocation -> List.of(location(invocation.getArgument(1))));
        when(jdbcTemplate.query(contains("GROUP BY coalesce(level"), any(RowMapper.class)))
                .thenAnswer(invocation -> List.of(level(invocation.getArgument(1))));

        var response = service.candidateSkillAnalytics();

        assertThat(response.publishedJobs()).isEqualTo(150);
        assertThat(response.averageSalaryMin()).isEqualTo(4200);
        assertThat(response.averageSalaryMax()).isEqualTo(7200);
        assertThat(response.topSkills()).extracting(SkillDemandResponse::skill).containsExactly("Kafka");
        assertThat(response.topLocations()).extracting(LocationDemandResponse::location).containsExactly("Ho Chi Minh City");
        assertThat(response.levelDistribution()).extracting(LevelDemandResponse::level).containsExactly("Senior");
    }

    @Test
    void candidateSkillAnalyticsDefaultsNullCountsToZero() {
        when(jdbcTemplate.queryForObject(eq("SELECT count(*) FROM jobs WHERE status = 'PUBLISHED'"), eq(Long.class)))
                .thenReturn(null);
        when(jdbcTemplate.queryForObject(contains("avg(salary_min)"), eq(Long.class))).thenReturn(null);
        when(jdbcTemplate.queryForObject(contains("avg(salary_max)"), eq(Long.class))).thenReturn(null);
        when(jdbcTemplate.query(contains("regexp_split_to_table"), any(RowMapper.class))).thenReturn(List.of());
        when(jdbcTemplate.query(contains("GROUP BY coalesce(location"), any(RowMapper.class))).thenReturn(List.of());
        when(jdbcTemplate.query(contains("GROUP BY coalesce(level"), any(RowMapper.class))).thenReturn(List.of());

        var response = service.candidateSkillAnalytics();

        assertThat(response.publishedJobs()).isZero();
        assertThat(response.averageSalaryMin()).isZero();
        assertThat(response.averageSalaryMax()).isZero();
    }

    private static SkillDemandResponse skill(RowMapper<SkillDemandResponse> mapper) throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getString("skill")).thenReturn("Kafka");
        when(rs.getLong("jobs")).thenReturn(48L);
        return mapper.mapRow(rs, 0);
    }

    private static LocationDemandResponse location(RowMapper<LocationDemandResponse> mapper) throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getString("location")).thenReturn("Ho Chi Minh City");
        when(rs.getLong("jobs")).thenReturn(42L);
        return mapper.mapRow(rs, 0);
    }

    private static LevelDemandResponse level(RowMapper<LevelDemandResponse> mapper) throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getString("level")).thenReturn("Senior");
        when(rs.getLong("jobs")).thenReturn(80L);
        return mapper.mapRow(rs, 0);
    }
}
