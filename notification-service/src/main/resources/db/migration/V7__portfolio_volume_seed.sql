WITH notification_seed AS (
    SELECT
        i,
        CASE
            WHEN i % 4 = 0 THEN ('10000000-0000-0000-0002-' || lpad((((i - 1) % 12) + 1)::text, 12, '0'))::uuid
            ELSE ('10000000-0000-0000-0001-' || lpad((((i - 1) % 60) + 1)::text, 12, '0'))::uuid
        END AS recipient_id,
        CASE
            WHEN i % 4 = 0 THEN 'APPLICATION_SUBMITTED'
            WHEN i % 7 = 0 THEN 'APPLICATION_STATUS_CHANGED'
            WHEN i % 9 = 0 THEN 'JOB_APPROVED'
            ELSE 'RECRUITER_UPDATE'
        END AS notification_type,
        CASE
            WHEN i % 4 = 0 THEN 'New candidate application'
            WHEN i % 7 = 0 THEN 'Application status changed'
            WHEN i % 9 = 0 THEN 'Job approved and published'
            ELSE 'Recruitment pipeline update'
        END AS title,
        CASE
            WHEN i % 6 = 0 THEN 'SENT'
            WHEN i % 10 = 0 THEN 'FAILED_RETRYABLE'
            WHEN i % 17 = 0 THEN 'FAILED_PERMANENT'
            WHEN i % 19 = 0 THEN 'SKIPPED_NO_EMAIL'
            ELSE 'PENDING'
        END AS email_status
    FROM generate_series(1, 220) AS i
)
INSERT INTO notifications (
    id, recipient_id, type, title, message, read_at, created_at, updated_at, version,
    email_status, email_recipient, email_provider_message_id, email_failure_reason, email_sent_at,
    email_attempts, email_next_attempt_at, email_last_attempt_at
)
SELECT
    ('50000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid,
    recipient_id,
    notification_type,
    title,
    format('Portfolio volume notification %s: realistic recruitment activity for dashboards, pagination, unread counts, and email delivery review.', i),
    CASE WHEN i % 3 = 0 THEN now() - ((i % 8) || ' hours')::interval ELSE NULL END,
    now() - ((i % 45) || ' days')::interval,
    now() - ((i % 12) || ' hours')::interval,
    0,
    email_status,
    CASE
        WHEN email_status = 'SKIPPED_NO_EMAIL' THEN NULL
        WHEN recipient_id::text LIKE '10000000-0000-0000-0002-%' THEN format('employer%02s@devhire.local', ((i - 1) % 12) + 1)
        ELSE format('candidate%02s@devhire.local', ((i - 1) % 60) + 1)
    END,
    CASE WHEN email_status = 'SENT' THEN format('mailpit-portfolio-%s', lpad(i::text, 4, '0')) ELSE NULL END,
    CASE
        WHEN email_status = 'FAILED_RETRYABLE' THEN 'Seeded transient SMTP timeout for retry queue evidence'
        WHEN email_status = 'FAILED_PERMANENT' THEN 'Seeded invalid recipient for permanent failure evidence'
        WHEN email_status = 'SKIPPED_NO_EMAIL' THEN 'Recipient email was unavailable in seeded profile data'
        ELSE NULL
    END,
    CASE WHEN email_status = 'SENT' THEN now() - ((i % 8) || ' hours')::interval ELSE NULL END,
    CASE
        WHEN email_status IN ('FAILED_RETRYABLE', 'FAILED_PERMANENT') THEN 2
        WHEN email_status = 'SENT' THEN 1
        ELSE 0
    END,
    CASE WHEN email_status IN ('PENDING', 'FAILED_RETRYABLE') THEN now() + ((i % 15) || ' minutes')::interval ELSE NULL END,
    CASE WHEN email_status IN ('SENT', 'FAILED_RETRYABLE', 'FAILED_PERMANENT') THEN now() - ((i % 90) || ' minutes')::interval ELSE NULL END
FROM notification_seed
ON CONFLICT (id) DO NOTHING;
