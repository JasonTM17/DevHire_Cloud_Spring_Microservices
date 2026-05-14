import type {
  CodeAssessmentRunnerHealth,
  CodeAssessmentSummary,
  OperationsSummary,
} from "@/types/domain";
import type { ServiceHealth, ServiceStatus } from "./types";

const OPS_SIGNAL_SERVICES = [
  "api-gateway",
  "audit-service",
  "application-service",
  "assessment-runner",
] as const;

export type OpsHealthSummary = {
  services: ServiceHealth[];
  activeIncidents: number;
  lastRefresh: string;
};

export function buildOpsHealthSummary(
  operations: OperationsSummary,
  codeAssessments: CodeAssessmentSummary,
  checkedAt: string = new Date().toISOString()
): OpsHealthSummary {
  const runner = codeAssessments.runnerHealth;
  const services: ServiceHealth[] = [
    {
      name: "api-gateway",
      status: "healthy",
      lastCheck: checkedAt,
      source: "GET /api/admin/operations/summary",
      detail: "Gateway routed the admin operations summary successfully.",
    },
    {
      name: "audit-service",
      status: operations.latestEventAt || operations.auditEvents > 0 ? "healthy" : "degraded",
      lastCheck: operations.latestEventAt ?? checkedAt,
      source: "Admin operations summary",
      detail: `${operations.auditEvents.toLocaleString()} audit events across ${operations.distinctActors.toLocaleString()} actors.`,
    },
    {
      name: "application-service",
      status: "healthy",
      lastCheck: checkedAt,
      source: "GET /api/admin/code-assessments/summary",
      detail: `${codeAssessments.totalAssignments.toLocaleString()} code assessment assignments tracked.`,
    },
    {
      name: "assessment-runner",
      status: runnerToServiceStatus(runner),
      lastCheck: runner.checkedAt ?? checkedAt,
      source: "Code assessment runner health",
      detail: runnerDetail(runner),
    },
  ];

  return {
    services,
    activeIncidents: services.filter((service) => service.status === "critical").length,
    lastRefresh: runner.checkedAt ?? operations.latestEventAt ?? checkedAt,
  };
}

export function unknownOpsHealthSummary(
  reason: string,
  checkedAt: string = new Date().toISOString()
): OpsHealthSummary {
  const detail = normalizeUnavailableReason(reason);
  return {
    services: OPS_SIGNAL_SERVICES.map((name) => ({
      name,
      status: "unknown",
      lastCheck: checkedAt,
      source: detail.requiresAdmin ? "Admin sign-in required" : "Admin health synthesis",
      detail: detail.message,
    })),
    activeIncidents: 0,
    lastRefresh: checkedAt,
  };
}

export function runnerToServiceStatus(runner: CodeAssessmentRunnerHealth): ServiceStatus {
  const normalizedStatus = runner.status?.toUpperCase();
  if (runner.failClosed) return "critical";
  if (normalizedStatus === "UP" || normalizedStatus === "HEALTHY") return "healthy";
  if (normalizedStatus === "DOWN") return "critical";
  if (normalizedStatus === "DEGRADED") return "degraded";
  return "unknown";
}

function runnerDetail(runner: CodeAssessmentRunnerHealth): string {
  const parts = [
    `mode=${runner.mode || "unknown"}`,
    `queue=${runner.queueDepth ?? 0}`,
    `judge0=${runner.judge0Configured ? "configured" : "not-configured"}`,
  ];

  if (runner.failClosedReason) {
    parts.push(`failClosedReason=${runner.failClosedReason}`);
  }

  if (runner.lastSmokeStatus) {
    parts.push(`lastSmoke=${runner.lastSmokeStatus}`);
  }

  return parts.join("; ");
}

function normalizeUnavailableReason(reason: string): { message: string; requiresAdmin: boolean } {
  if (/bearer|unauthori[sz]ed|forbidden|401|403/i.test(reason)) {
    return {
      requiresAdmin: true,
      message: "Sign in as an admin to view live service health.",
    };
  }
  if (/failed to fetch|network/i.test(reason)) {
    return {
      requiresAdmin: false,
      message: "Admin health APIs are unreachable from this browser session.",
    };
  }
  return {
    requiresAdmin: false,
    message: reason || "Waiting for the first admin health poll.",
  };
}
