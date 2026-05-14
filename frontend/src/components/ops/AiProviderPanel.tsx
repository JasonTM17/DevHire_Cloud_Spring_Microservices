"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/primitives/Badge";
import { InlineAlert } from "@/components/ui/feedback/InlineAlert";
import { OpsWidget } from "./OpsWidget";
import "@/styles/components/ai-ops-panels.css";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface AiProviderStatus {
  name: string;
  model: string;
  circuitState: CircuitState;
  consecutiveFailures: number;
  lastFailureReason: string | null;
  cooldownEndsAt?: string;
}

export interface AiProviderPanelProps {
  provider: AiProviderStatus;
  loading?: boolean;
  "data-testid"?: string;
}

function getCircuitBadgeVariant(state: CircuitState) {
  switch (state) {
    case "CLOSED":
      return "success";
    case "OPEN":
      return "error";
    case "HALF_OPEN":
      return "warning";
  }
}

/**
 * Determines whether the circuit-open banner should be visible.
 * Pure function for testability (Property 23).
 */
export function showCircuitOpenBanner(state: CircuitState): boolean {
  return state === "OPEN";
}

function formatCooldownRemaining(cooldownEndsAt: string): string {
  const remaining = new Date(cooldownEndsAt).getTime() - Date.now();
  if (remaining <= 0) return "Cooldown expired";
  const seconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${secs}s remaining`;
  }
  return `${secs}s remaining`;
}

/**
 * AiProviderPanel - Displays AI provider status including circuit breaker state.
 * When circuit is OPEN, shows a prominent error alert with cooldown timer
 * and reviewer-safe provider backup indicator.
 *
 * Wrapped in OpsWidget for consistent dark theme styling and error isolation.
 *
 * Requirements: 8.1, 8.2
 */
export function AiProviderPanel({
  provider,
  loading = false,
  "data-testid": testId,
}: AiProviderPanelProps) {
  const [cooldownDisplay, setCooldownDisplay] = useState<string>("");

  useEffect(() => {
    if (!provider.cooldownEndsAt || provider.circuitState !== "OPEN") {
      setCooldownDisplay("");
      return;
    }

    setCooldownDisplay(formatCooldownRemaining(provider.cooldownEndsAt));

    const interval = setInterval(() => {
      setCooldownDisplay(formatCooldownRemaining(provider.cooldownEndsAt!));
    }, 1000);

    return () => clearInterval(interval);
  }, [provider.cooldownEndsAt, provider.circuitState]);

  const headerActions = (
    <Badge
      variant={getCircuitBadgeVariant(provider.circuitState)}
      dot
      data-testid="circuit-state-badge"
    >
      {provider.circuitState.replace("_", " ")}
    </Badge>
  );

  return (
    <OpsWidget
      title="AI Provider"
      headerActions={headerActions}
      loading={loading}
      data-testid={testId ?? "ai-provider-panel"}
    >
      <div className="dh-ai-provider-panel">
        {showCircuitOpenBanner(provider.circuitState) && (
          <InlineAlert
            variant="error"
            title="Circuit Breaker Open"
            data-testid="circuit-open-alert"
          >
            <div className="dh-ai-provider-panel__alert-content">
              <p>
                Provider is unavailable. Requests are using reviewer-safe
                provider backup mode.
              </p>
              {cooldownDisplay && (
                <span
                  className="dh-ai-provider-panel__cooldown"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  Timer: {cooldownDisplay}
                </span>
              )}
              <Badge variant="warning" size="sm">
                Provider Backup Active
              </Badge>
            </div>
          </InlineAlert>
        )}

        <dl className="dh-ai-provider-panel__fields">
          <div className="dh-ai-provider-panel__field">
            <dt>Provider</dt>
            <dd data-testid="provider-name">{provider.name}</dd>
          </div>
          <div className="dh-ai-provider-panel__field">
            <dt>Model</dt>
            <dd data-testid="provider-model">{provider.model}</dd>
          </div>
          <div className="dh-ai-provider-panel__field">
            <dt>Consecutive Failures</dt>
            <dd data-testid="consecutive-failures">
              {provider.consecutiveFailures}
            </dd>
          </div>
          {provider.lastFailureReason && (
            <div className="dh-ai-provider-panel__field">
              <dt>Last Failure</dt>
              <dd
                className="dh-ai-provider-panel__failure-reason"
                data-testid="last-failure-reason"
              >
                {provider.lastFailureReason}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </OpsWidget>
  );
}
