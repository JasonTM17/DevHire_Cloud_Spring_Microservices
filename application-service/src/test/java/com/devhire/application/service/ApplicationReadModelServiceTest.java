package com.devhire.application.service;

import com.devhire.application.dto.response.CandidateAssessmentResponse;
import com.devhire.application.dto.response.CandidateOfferResponse;
import com.devhire.application.dto.response.CandidateTimelineItemResponse;
import com.devhire.application.dto.response.StatusCountResponse;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ApplicationReadModelServiceTest {
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final ApplicationReadModelService service = new ApplicationReadModelService(jdbcTemplate);
    private final UUID candidateId = UUID.randomUUID();
    private final UUID employerId = UUID.randomUUID();

    @Test
    void candidateDashboardAggregatesApplicationsOffersAndTimeline() throws Exception {
        stubCandidateStatusCounts(candidateId);
        stubCandidateTimeline(candidateId, 6, "Interview panel scheduled");
        when(jdbcTemplate.queryForObject(contains("candidate_offers"), eq(Long.class), eq(candidateId)))
                .thenReturn(1L);

        var summary = service.candidateDashboard(candidate());

        assertThat(summary.applications()).isEqualTo(6);
        assertThat(summary.activeApplications()).isEqualTo(5);
        assertThat(summary.interviews()).isEqualTo(2);
        assertThat(summary.offers()).isEqualTo(1);
        assertThat(summary.timeline()).extracting(CandidateTimelineItemResponse::description)
                .containsExactly("Interview panel scheduled");
    }

    @Test
    void candidateApplicationsSummaryCountsDuplicateProtectedJobs() throws Exception {
        stubCandidateStatusCounts(candidateId);
        stubCandidateTimeline(candidateId, 12, "Application status changed");
        when(jdbcTemplate.queryForObject(contains("DISTINCT job_id"), eq(Long.class), eq(candidateId)))
                .thenReturn(4L);

        var summary = service.candidateApplications(candidate());

        assertThat(summary.totalApplications()).isEqualTo(6);
        assertThat(summary.duplicateProtectedJobs()).isEqualTo(4);
        assertThat(summary.recentActivity()).hasSize(1);
    }

    @Test
    void offersAndAssessmentsMapCsvFieldsIntoReadableLists() throws Exception {
        UUID offerId = UUID.randomUUID();
        UUID assessmentId = UUID.randomUUID();
        when(jdbcTemplate.query(contains("FROM candidate_offers"), any(RowMapper.class), eq(candidateId)))
                .thenAnswer(invocation -> {
                    RowMapper<CandidateOfferResponse> mapper = invocation.getArgument(1);
                    ResultSet rs = mock(ResultSet.class);
                    when(rs.getObject("id", UUID.class)).thenReturn(offerId);
                    when(rs.getObject("application_id", UUID.class)).thenReturn(UUID.randomUUID());
                    when(rs.getString("job_title")).thenReturn("Senior Distributed Systems Engineer");
                    when(rs.getString("company_name")).thenReturn("FinTech Corp");
                    when(rs.getString("compensation")).thenReturn("$6,800/month");
                    when(rs.getString("status")).thenReturn("PENDING");
                    when(rs.getString("highlights_csv")).thenReturn("Hybrid, Kafka ownership");
                    when(rs.getTimestamp("expires_at")).thenReturn(Timestamp.from(Instant.parse("2026-05-20T00:00:00Z")));
                    when(rs.getTimestamp("created_at")).thenReturn(Timestamp.from(Instant.parse("2026-05-01T00:00:00Z")));
                    return List.of(mapper.mapRow(rs, 0));
                });
        when(jdbcTemplate.query(contains("FROM candidate_assessments"), any(RowMapper.class), eq(candidateId)))
                .thenAnswer(invocation -> {
                    RowMapper<CandidateAssessmentResponse> mapper = invocation.getArgument(1);
                    ResultSet rs = mock(ResultSet.class);
                    when(rs.getObject("id", UUID.class)).thenReturn(assessmentId);
                    when(rs.getString("title")).thenReturn("Distributed Systems Assessment");
                    when(rs.getString("provider")).thenReturn("DevHire Labs");
                    when(rs.getInt("score")).thenReturn(86);
                    when(rs.getInt("max_score")).thenReturn(100);
                    when(rs.getString("status")).thenReturn("PASSED");
                    when(rs.getString("skills_csv")).thenReturn("Kafka, PostgreSQL");
                    when(rs.getTimestamp("completed_at")).thenReturn(Timestamp.from(Instant.parse("2026-05-02T00:00:00Z")));
                    return List.of(mapper.mapRow(rs, 0));
                });

        var offers = service.offers(candidate());
        var assessments = service.assessments(candidate());

        assertThat(offers).extracting(CandidateOfferResponse::highlights)
                .containsExactly(List.of("Hybrid", "Kafka ownership"));
        assertThat(assessments).extracting(CandidateAssessmentResponse::skills)
                .containsExactly(List.of("Kafka", "PostgreSQL"));
    }

    @Test
    void employerPipelineAggregatesOwnedApplications() throws Exception {
        when(jdbcTemplate.query(contains("WHERE employer_id"), any(RowMapper.class), eq(employerId)))
                .thenAnswer(invocation -> List.of(status(invocation.getArgument(1), "REVIEWING", 5)));
        when(jdbcTemplate.queryForObject(contains("DISTINCT candidate_id"), eq(Long.class), eq(employerId)))
                .thenReturn(4L);
        stubEmployerTimeline(employerId);

        var summary = service.employerPipeline(employer());

        assertThat(summary.totalApplications()).isEqualTo(5);
        assertThat(summary.activeCandidates()).isEqualTo(4);
        assertThat(summary.statusDistribution()).extracting(StatusCountResponse::status).containsExactly("REVIEWING");
    }

    @Test
    void candidateReadModelsRejectWrongRole() {
        AuthenticatedUser employer = employer();

        assertThatThrownBy(() -> service.candidateDashboard(employer))
                .isInstanceOf(DevHireException.class)
                .hasMessageContaining("Required role: CANDIDATE");
    }

    private void stubCandidateStatusCounts(UUID userId) throws Exception {
        when(jdbcTemplate.query(contains("WHERE candidate_id"), any(RowMapper.class), eq(userId)))
                .thenAnswer(invocation -> List.of(
                        status(invocation.getArgument(1), "INTERVIEW", 2),
                        status(invocation.getArgument(1), "OFFER", 1),
                        status(invocation.getArgument(1), "REJECTED", 1),
                        status(invocation.getArgument(1), "SUBMITTED", 2)));
    }

    private void stubCandidateTimeline(UUID userId, int limit, String note) throws Exception {
        when(jdbcTemplate.query(contains("JOIN application_status_history"), any(RowMapper.class), eq(userId), eq(limit)))
                .thenAnswer(invocation -> List.of(timeline(invocation.getArgument(1), note)));
    }

    private void stubEmployerTimeline(UUID userId) throws Exception {
        when(jdbcTemplate.query(contains("JOIN application_status_history"), any(RowMapper.class), eq(userId), eq(10)))
                .thenAnswer(invocation -> List.of(timeline(invocation.getArgument(1), "Employer review queued")));
    }

    private static StatusCountResponse status(RowMapper<StatusCountResponse> mapper, String status, long count) throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getString("status")).thenReturn(status);
        when(rs.getLong("total")).thenReturn(count);
        return mapper.mapRow(rs, 0);
    }

    private static CandidateTimelineItemResponse timeline(RowMapper<CandidateTimelineItemResponse> mapper, String note) throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getObject("id", UUID.class)).thenReturn(UUID.randomUUID());
        when(rs.getString("job_title")).thenReturn("Senior Platform Engineer");
        when(rs.getString("status")).thenReturn("INTERVIEW");
        when(rs.getString("note")).thenReturn(note);
        when(rs.getTimestamp("created_at")).thenReturn(Timestamp.from(Instant.parse("2026-05-05T10:00:00Z")));
        return mapper.mapRow(rs, 0);
    }

    private AuthenticatedUser candidate() {
        return new AuthenticatedUser(candidateId, "candidate@devhire.local", UserRole.CANDIDATE);
    }

    private AuthenticatedUser employer() {
        return new AuthenticatedUser(employerId, "employer@devhire.local", UserRole.EMPLOYER);
    }
}
