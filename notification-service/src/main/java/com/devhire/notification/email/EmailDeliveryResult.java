package com.devhire.notification.email;

public record EmailDeliveryResult(
        boolean sent,
        String providerMessageId,
        String failureReason
) {
    public static EmailDeliveryResult sent(String providerMessageId) {
        return new EmailDeliveryResult(true, providerMessageId, null);
    }

    public static EmailDeliveryResult failed(String reason) {
        return new EmailDeliveryResult(false, null, reason);
    }
}
