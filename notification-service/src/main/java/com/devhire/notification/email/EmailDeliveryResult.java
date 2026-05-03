package com.devhire.notification.email;

public record EmailDeliveryResult(
        boolean sent,
        String providerMessageId,
        String failureReason,
        boolean retryable
) {
    public static EmailDeliveryResult sent(String providerMessageId) {
        return new EmailDeliveryResult(true, providerMessageId, null, false);
    }

    public static EmailDeliveryResult failed(String reason) {
        return failedRetryable(reason);
    }

    public static EmailDeliveryResult failedRetryable(String reason) {
        return new EmailDeliveryResult(false, null, reason, true);
    }

    public static EmailDeliveryResult failedPermanent(String reason) {
        return new EmailDeliveryResult(false, null, reason, false);
    }
}
