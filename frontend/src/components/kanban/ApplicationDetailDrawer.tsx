"use client";

import { Drawer } from "@/components/ui/overlays/Drawer";
import { Tabs } from "@/components/ui/navigation/Tabs";
import { Avatar } from "@/components/ui/primitives/Avatar";
import { Badge } from "@/components/ui/primitives/Badge";
import type { Application } from "@/lib/kanban";

export interface ApplicationDetailDrawerProps {
  /** The application to display, or null if drawer should be empty */
  app: Application | null;
  /** Whether the drawer is open */
  open: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
}

/**
 * Side drawer showing detailed information about a selected application.
 *
 * Tabs:
 * - Application History: timeline of stage transitions
 * - Assessment Results: scores and test outcomes
 * - Communication Timeline: messages exchanged
 */
export function ApplicationDetailDrawer({
  app,
  open,
  onClose,
}: ApplicationDetailDrawerProps) {
  const title = app ? `${app.candidateName} — Details` : "Application Details";

  return (
    <Drawer
      isOpen={open}
      onClose={onClose}
      title={title}
      position="right"
      data-testid="application-detail-drawer"
    >
      {app ? (
        <ApplicationDetailContent app={app} />
      ) : (
        <div className="dh-app-drawer__placeholder">
          Select an application to view details.
        </div>
      )}
    </Drawer>
  );
}

// ─── Internal Components ─────────────────────────────────────────────────────

function ApplicationDetailContent({ app }: { app: Application }) {
  const tabs = [
    {
      id: "history",
      label: "Application History",
      content: <ApplicationHistoryTab app={app} />,
    },
    {
      id: "assessment",
      label: "Assessment Results",
      content: <AssessmentResultsTab app={app} />,
    },
    {
      id: "communication",
      label: "Communication",
      content: <CommunicationTab app={app} />,
    },
  ];

  return (
    <div>
      {/* Header with avatar and basic info */}
      <div className="dh-app-drawer__header">
        <Avatar
          src={app.avatarUrl}
          alt={app.candidateName}
          size="lg"
        />
        <div className="dh-app-drawer__info">
          <div className="dh-app-drawer__name">{app.candidateName}</div>
          <div className="dh-app-drawer__job">{app.jobTitle}</div>
          <div className="dh-app-drawer__stage">
            <Badge variant="info" size="sm">
              {app.stage}
            </Badge>
          </div>
        </div>
      </div>

      {/* Tabbed content */}
      <Tabs tabs={tabs} defaultTab="history" />
    </div>
  );
}

function ApplicationHistoryTab({ app }: { app: Application }) {
  return (
    <div data-testid="app-history-tab">
      <p style={{ color: "var(--dh-color-fg-muted)", fontSize: "var(--dh-font-size-sm)" }}>
        Application history for {app.candidateName}.
      </p>
      <ul style={{ listStyle: "none", padding: 0, marginTop: "var(--dh-space-3)" }}>
        <li style={{ padding: "var(--dh-space-2) 0", borderBottom: "1px solid var(--dh-color-border)" }}>
          <strong>Current Stage:</strong> {app.stage}
        </li>
        <li style={{ padding: "var(--dh-space-2) 0", borderBottom: "1px solid var(--dh-color-border)" }}>
          <strong>Time in Stage:</strong> {formatTimeInStage(app.timeInStage)}
        </li>
        {app.assessmentScore !== undefined && (
          <li style={{ padding: "var(--dh-space-2) 0" }}>
            <strong>Assessment Score:</strong> {app.assessmentScore}%
          </li>
        )}
      </ul>
    </div>
  );
}

function AssessmentResultsTab({ app }: { app: Application }) {
  return (
    <div data-testid="app-assessment-tab">
      {app.assessmentScore !== undefined ? (
        <div>
          <p style={{ color: "var(--dh-color-fg-muted)", fontSize: "var(--dh-font-size-sm)" }}>
            Assessment results for {app.candidateName}.
          </p>
          <div style={{ marginTop: "var(--dh-space-3)", padding: "var(--dh-space-3)", background: "var(--dh-color-bg-subtle)", borderRadius: "var(--dh-radius-md)" }}>
            <div style={{ fontSize: "var(--dh-font-size-2xl)", fontWeight: "var(--dh-font-weight-bold)", color: "var(--dh-color-fg-default)" }}>
              {app.assessmentScore}%
            </div>
            <div style={{ fontSize: "var(--dh-font-size-sm)", color: "var(--dh-color-fg-muted)", marginTop: "var(--dh-space-1)" }}>
              Overall Score
            </div>
          </div>
        </div>
      ) : (
        <p style={{ color: "var(--dh-color-fg-muted)", fontSize: "var(--dh-font-size-sm)" }}>
          No assessment results available yet.
        </p>
      )}
    </div>
  );
}

function CommunicationTab({ app }: { app: Application }) {
  return (
    <div data-testid="app-communication-tab">
      <p style={{ color: "var(--dh-color-fg-muted)", fontSize: "var(--dh-font-size-sm)" }}>
        Communication timeline for {app.candidateName}.
      </p>
      <div style={{ marginTop: "var(--dh-space-3)", textAlign: "center", padding: "var(--dh-space-6)", color: "var(--dh-color-fg-muted)" }}>
        No messages yet.
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeInStage(hours: number): string {
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""}`;
}
