package com.devhire.common.constants;

public final class KafkaTopics {
    public static final String AUDIT_EVENTS = "audit.events";
    public static final String APPLICATION_EVENTS = "application.events";
    public static final String JOB_EVENTS = "job.events";
    public static final String JOB_CREATED = "job.created";
    public static final String JOB_UPDATED = "job.updated";
    public static final String JOB_DELETED = "job.deleted";
    public static final String COMPANY_EVENTS = "company.events";
    public static final String NOTIFICATION_EVENTS = "notification.events";
    public static final String LEADERBOARD_CHANGED = "leaderboard.changed";
    public static final String ASSESSMENT_PROGRESS = "assessment.progress";

    private KafkaTopics() {
    }
}

