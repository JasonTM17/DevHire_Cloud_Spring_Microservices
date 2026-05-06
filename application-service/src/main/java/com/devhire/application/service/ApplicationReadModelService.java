package com.devhire.application.service;

import com.devhire.application.dto.response.CandidateApplicationsSummaryResponse;
import com.devhire.application.dto.response.CandidateAssessmentResponse;
import com.devhire.application.dto.response.CandidateDashboardSummaryResponse;
import com.devhire.application.dto.response.CandidateOfferResponse;
import com.devhire.application.dto.response.CandidateTimelineItemResponse;
import com.devhire.application.dto.response.EmployerPipelineSummaryResponse;
import com.devhire.application.dto.response.StatusCountResponse;
import com.devhire.common.error.ErrorCode;
import com.devhire.common.exception.DevHireException;
import com.devhire.common.security.AuthenticatedUser;
import com.devhire.common.security.UserRole;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Service
public class ApplicationReadModelService {
    private final JdbcTemplate jdbcTemplate;

    public ApplicationReadModelService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public CandidateDashboardSummaryResponse candidateDashboard(AuthenticatedUser user) {
        requireRole(user, UserRole.CANDIDATE);
        List<StatusCountResponse> distribution = candidateStatusCounts(user.id());
        long applications = sum(distribution);
        long interviews = count(distribution, "INTERVIEW");
        long offers = count(distribution, "OFFER") + countOffers(user.id());
        long active = applications - count(distribution, "REJECTED") - count(distribution, "WITHDRAWN");
        return new CandidateDashboardSummaryResponse(
                applications, active, interviews, offers, distribution, candidateTimeline(user.id(), 6));
    }

    @Transactional(readOnly = true)
    public CandidateApplicationsSummaryResponse candidateApplications(AuthenticatedUser user) {
        requireRole(user, UserRole.CANDIDATE);
        List<StatusCountResponse> distribution = candidateStatusCounts(user.id());
        long total = sum(distribution);
        Long duplicateProtected = jdbcTemplate.queryForObject("""
                SELECT count(DISTINCT job_id) FROM job_applications WHERE candidate_id = ?
                """, Long.class, user.id());
        return new CandidateApplicationsSummaryResponse(
                total,
                duplicateProtected == null ? 0 : duplicateProtected,
                distribution,
                candidateTimeline(user.id(), 12));
    }

    @Transactional(readOnly = true)
    public List<CandidateOfferResponse> offers(AuthenticatedUser user) {
        requireRole(user, UserRole.CANDIDATE);
        return jdbcTemplate.query("""
                SELECT id, application_id, job_title, company_name, compensation, status,
                       highlights_csv, expires_at, created_at
                FROM candidate_offers
                WHERE candidate_id = ?
                ORDER BY created_at DESC
                """, (rs, rowNum) -> new CandidateOfferResponse(
                rs.getObject("id", UUID.class),
                rs.getObject("application_id", UUID.class),
                rs.getString("job_title"),
                rs.getString("company_name"),
                rs.getString("compensation"),
                rs.getString("status"),
                splitCsv(rs.getString("highlights_csv")),
                instant(rs.getTimestamp("expires_at")),
                instant(rs.getTimestamp("created_at"))), user.id());
    }

    @Transactional(readOnly = true)
    public List<CandidateAssessmentResponse> assessments(AuthenticatedUser user) {
        requireRole(user, UserRole.CANDIDATE);
        return jdbcTemplate.query("""
                SELECT id, title, provider, score, max_score, status, skills_csv, completed_at
                FROM candidate_assessments
                WHERE candidate_id = ?
                ORDER BY created_at DESC
                """, (rs, rowNum) -> new CandidateAssessmentResponse(
                rs.getObject("id", UUID.class),
                rs.getString("title"),
                rs.getString("provider"),
                rs.getInt("score"),
                rs.getInt("max_score"),
                rs.getString("status"),
                splitCsv(rs.getString("skills_csv")),
                instant(rs.getTimestamp("completed_at"))), user.id());
    }

    @Transactional(readOnly = true)
    public EmployerPipelineSummaryResponse employerPipeline(AuthenticatedUser user) {
        requireRole(user, UserRole.EMPLOYER);
        List<StatusCountResponse> distribution = jdbcTemplate.query("""
                SELECT status, count(*) AS total
                FROM job_applications
                WHERE employer_id = ?
                GROUP BY status
                ORDER BY status
                """, (rs, rowNum) -> new StatusCountResponse(rs.getString("status"), rs.getLong("total")), user.id());
        Long activeCandidates = jdbcTemplate.queryForObject("""
                SELECT count(DISTINCT candidate_id) FROM job_applications WHERE employer_id = ?
                """, Long.class, user.id());
        return new EmployerPipelineSummaryResponse(
                sum(distribution),
                activeCandidates == null ? 0 : activeCandidates,
                count(distribution, "INTERVIEW"),
                count(distribution, "OFFER"),
                distribution,
                employerTimeline(user.id(), 10));
    }

    private List<StatusCountResponse> candidateStatusCounts(UUID candidateId) {
        return jdbcTemplate.query("""
                SELECT status, count(*) AS total
                FROM job_applications
                WHERE candidate_id = ?
                GROUP BY status
                ORDER BY status
                """, (rs, rowNum) -> new StatusCountResponse(rs.getString("status"), rs.getLong("total")), candidateId);
    }

    private List<CandidateTimelineItemResponse> candidateTimeline(UUID candidateId, int limit) {
        return jdbcTemplate.query("""
                SELECT ja.id, ja.job_title, ja.status, h.note, h.created_at
                FROM job_applications ja
                JOIN application_status_history h ON h.application_id = ja.id
                WHERE ja.candidate_id = ?
                ORDER BY h.created_at DESC
                LIMIT ?
                """, (rs, rowNum) -> new CandidateTimelineItemResponse(
                rs.getObject("id", UUID.class),
                rs.getString("job_title"),
                rs.getString("status"),
                rs.getString("note"),
                instant(rs.getTimestamp("created_at"))), candidateId, limit);
    }

    private List<CandidateTimelineItemResponse> employerTimeline(UUID employerId, int limit) {
        return jdbcTemplate.query("""
                SELECT ja.id, ja.job_title, ja.status, h.note, h.created_at
                FROM job_applications ja
                JOIN application_status_history h ON h.application_id = ja.id
                WHERE ja.employer_id = ?
                ORDER BY h.created_at DESC
                LIMIT ?
                """, (rs, rowNum) -> new CandidateTimelineItemResponse(
                rs.getObject("id", UUID.class),
                rs.getString("job_title"),
                rs.getString("status"),
                rs.getString("note"),
                instant(rs.getTimestamp("created_at"))), employerId, limit);
    }

    private long countOffers(UUID candidateId) {
        Long value = jdbcTemplate.queryForObject("""
                SELECT count(*) FROM candidate_offers WHERE candidate_id = ? AND status IN ('SENT', 'ACCEPTED')
                """, Long.class, candidateId);
        return value == null ? 0 : value;
    }

    private static long sum(List<StatusCountResponse> counts) {
        return counts.stream().mapToLong(StatusCountResponse::count).sum();
    }

    private static long count(List<StatusCountResponse> counts, String status) {
        return counts.stream()
                .filter(item -> item.status().equals(status))
                .mapToLong(StatusCountResponse::count)
                .findFirst()
                .orElse(0);
    }

    private static Instant instant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    private static List<String> splitCsv(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .toList();
    }

    private static void requireRole(AuthenticatedUser user, UserRole role) {
        if (user.role() != role) {
            throw new DevHireException(ErrorCode.FORBIDDEN, "Required role: " + role);
        }
    }
}
