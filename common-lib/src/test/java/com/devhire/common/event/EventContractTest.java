package com.devhire.common.event;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class EventContractTest {
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    @Test
    void applicationSubmittedEventKeepsStableJsonContract() throws Exception {
        ApplicationSubmittedEvent event = new ApplicationSubmittedEvent(
                UUID.fromString("70000000-0000-0000-0000-000000000001"),
                UUID.fromString("40000000-0000-0000-0000-000000000001"),
                UUID.fromString("30000000-0000-0000-0000-000000000001"),
                UUID.fromString("00000000-0000-0000-0000-000000000003"),
                UUID.fromString("00000000-0000-0000-0000-000000000002"),
                "Senior Java Backend Engineer",
                Instant.parse("2026-05-02T00:00:00Z")
        );

        String json = objectMapper.writeValueAsString(event);

        assertThat(json).contains("\"applicationId\":\"40000000-0000-0000-0000-000000000001\"");
        assertThat(json).contains("\"candidateId\":\"00000000-0000-0000-0000-000000000003\"");
        assertThat(json).contains("\"employerId\":\"00000000-0000-0000-0000-000000000002\"");
        assertThat(objectMapper.readValue(json, ApplicationSubmittedEvent.class)).isEqualTo(event);
    }

    @Test
    void auditEventKeepsMetadataAsObjectMap() throws Exception {
        AuditEvent event = new AuditEvent(
                UUID.fromString("71000000-0000-0000-0000-000000000001"),
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                "admin@devhire.local",
                "ADMIN",
                "approve job",
                "job",
                "30000000-0000-0000-0000-000000000001",
                Map.of("status", "PUBLISHED"),
                Instant.parse("2026-05-02T00:00:00Z")
        );

        String json = objectMapper.writeValueAsString(event);
        AuditEvent restored = objectMapper.readValue(json, AuditEvent.class);

        assertThat(json).contains("\"metadata\":{\"status\":\"PUBLISHED\"}");
        assertThat(restored.metadata()).containsEntry("status", "PUBLISHED");
        assertThat(restored.action()).isEqualTo("approve job");
    }

    @Test
    void applicationStatusChangedEventKeepsVersionedFieldsStable() throws Exception {
        ApplicationStatusChangedEvent event = new ApplicationStatusChangedEvent(
                UUID.fromString("72000000-0000-0000-0000-000000000001"),
                UUID.fromString("40000000-0000-0000-0000-000000000001"),
                UUID.fromString("30000000-0000-0000-0000-000000000001"),
                UUID.fromString("00000000-0000-0000-0000-000000000003"),
                UUID.fromString("00000000-0000-0000-0000-000000000002"),
                "SUBMITTED",
                "INTERVIEW",
                Instant.parse("2026-05-02T01:00:00Z")
        );

        String json = objectMapper.writeValueAsString(event);
        ApplicationStatusChangedEvent restored = objectMapper.readValue(json, ApplicationStatusChangedEvent.class);

        assertThat(json).contains("\"eventId\":\"72000000-0000-0000-0000-000000000001\"");
        assertThat(json).contains("\"oldStatus\":\"SUBMITTED\"");
        assertThat(json).contains("\"newStatus\":\"INTERVIEW\"");
        assertThat(restored).isEqualTo(event);
    }

    @Test
    void jobApprovedEventKeepsConsumerNotificationFieldsStable() throws Exception {
        JobApprovedEvent event = new JobApprovedEvent(
                UUID.fromString("73000000-0000-0000-0000-000000000001"),
                UUID.fromString("30000000-0000-0000-0000-000000000001"),
                UUID.fromString("00000000-0000-0000-0000-000000000002"),
                "Senior Java Backend Engineer",
                Instant.parse("2026-05-02T02:00:00Z")
        );

        String json = objectMapper.writeValueAsString(event);
        JobApprovedEvent restored = objectMapper.readValue(json, JobApprovedEvent.class);

        assertThat(json).contains("\"jobId\":\"30000000-0000-0000-0000-000000000001\"");
        assertThat(json).contains("\"employerId\":\"00000000-0000-0000-0000-000000000002\"");
        assertThat(json).contains("\"title\":\"Senior Java Backend Engineer\"");
        assertThat(restored).isEqualTo(event);
    }

    @Test
    void companyReviewedEventKeepsJobServiceFieldsStable() throws Exception {
        CompanyReviewedEvent event = new CompanyReviewedEvent(
                UUID.fromString("74000000-0000-0000-0000-000000000001"),
                UUID.fromString("20000000-0000-0000-0000-000000000001"),
                UUID.fromString("00000000-0000-0000-0000-000000000002"),
                "APPROVED",
                Instant.parse("2026-05-02T03:00:00Z")
        );

        String json = objectMapper.writeValueAsString(event);
        CompanyReviewedEvent restored = objectMapper.readValue(json, CompanyReviewedEvent.class);

        assertThat(json).contains("\"companyId\":\"20000000-0000-0000-0000-000000000001\"");
        assertThat(json).contains("\"status\":\"APPROVED\"");
        assertThat(restored).isEqualTo(event);
    }
}
