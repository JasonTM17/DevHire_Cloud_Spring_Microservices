package com.devhire.company.event;

import com.devhire.common.constants.KafkaTopics;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.event.CompanyReviewedEvent;
import com.devhire.common.outbox.OutboxEventWriter;
import org.springframework.stereotype.Component;

@Component
public class CompanyEventPublisher {
    private static final String COMPANY_AGGREGATE = "COMPANY";

    private final OutboxEventWriter outboxEventWriter;

    public CompanyEventPublisher(OutboxEventWriter outboxEventWriter) {
        this.outboxEventWriter = outboxEventWriter;
    }

    public void publishAudit(AuditEvent event) {
        outboxEventWriter.enqueue(KafkaTopics.AUDIT_EVENTS, event.eventId(), COMPANY_AGGREGATE,
                event.actorId(), event.action(), event);
    }

    public void publishCompanyReviewed(CompanyReviewedEvent event) {
        outboxEventWriter.enqueue(KafkaTopics.COMPANY_EVENTS, event.eventId(), COMPANY_AGGREGATE,
                event.companyId(), "COMPANY_REVIEWED", event);
    }
}
