package com.devhire.job.event;

import com.devhire.common.constants.KafkaTopics;
import com.devhire.common.event.AuditEvent;
import com.devhire.common.event.JobApprovedEvent;
import com.devhire.common.outbox.OutboxEventWriter;
import org.springframework.stereotype.Component;

@Component
public class JobEventPublisher {
    private static final String JOB_AGGREGATE = "JOB";

    private final OutboxEventWriter outboxEventWriter;

    public JobEventPublisher(OutboxEventWriter outboxEventWriter) {
        this.outboxEventWriter = outboxEventWriter;
    }

    public void publishAudit(AuditEvent event) {
        outboxEventWriter.enqueue(KafkaTopics.AUDIT_EVENTS, event.eventId(), JOB_AGGREGATE,
                event.actorId(), event.action(), event);
    }

    public void publishJobApproved(JobApprovedEvent event) {
        outboxEventWriter.enqueue(KafkaTopics.JOB_EVENTS, event.eventId(), JOB_AGGREGATE,
                event.jobId(), "JOB_APPROVED", event);
    }
}
