"use client";

import { useCallback, useState } from "react";
import { VirtualList } from "@/components/ui/data-display";
import { Badge } from "@/components/ui/primitives/Badge";
import { useDataFetcher } from "@/hooks/useDataFetcher";
import { api } from "@/lib/api";
import type { AuditLog } from "@/types/domain";
import "@/styles/components/audit-feed.css";

// ─── Constants ───────────────────────────────────────────────────────────────

const VIRTUALIZATION_THRESHOLD = 50;
const ITEM_HEIGHT = 56;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function getActionBadgeVariant(
  action: string
): "success" | "warning" | "error" | "info" | "default" {
  const lower = action.toLowerCase();
  if (lower.includes("create") || lower.includes("approve")) return "success";
  if (lower.includes("delete") || lower.includes("reject")) return "error";
  if (lower.includes("update") || lower.includes("modify")) return "warning";
  if (lower.includes("login") || lower.includes("auth")) return "info";
  return "default";
}

function formatResource(log: AuditLog): string {
  const targetType = log.targetType || "resource";
  const targetId = log.targetId ? log.targetId.slice(0, 8) : "pending";
  return `${targetType}/${targetId}`;
}

// ─── AuditRow ────────────────────────────────────────────────────────────────

function AuditRow({ log }: { log: AuditLog }) {
  return (
    <div className="dh-audit-feed__row" data-testid={`audit-row-${log.id}`}>
      <span className="dh-audit-feed__timestamp">
        {formatTimestamp(log.createdAt)}
      </span>
      <span className="dh-audit-feed__actor" title={log.actorEmail}>
        {log.actorEmail}
      </span>
      <span className="dh-audit-feed__action">
        {log.action.replaceAll("_", " ").toLowerCase()}
      </span>
      <span className="dh-audit-feed__resource">
        {formatResource(log)}
      </span>
      <Badge
        variant={getActionBadgeVariant(log.action)}
        size="sm"
        className="dh-audit-feed__status-badge"
      >
        {log.actorRole}
      </Badge>
    </div>
  );
}

// ─── AuditFeedPanel ──────────────────────────────────────────────────────────

/**
 * AuditFeedPanel — Self-contained panel that fetches audit logs via
 * useDataFetcher with cursor pagination. Uses VirtualList when items
 * exceed 50 for performance.
 *
 * Each row displays: timestamp, actor, action, resource, status badge.
 *
 * Requirements: 10.6
 */
export function AuditFeedPanel() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const fetchAuditLogs = useCallback(async () => {
    const response = await api.auditLogs();
    return response;
  }, []);

  const { data, error, isValidating } = useDataFetcher(
    "ops:audit-logs",
    fetchAuditLogs,
    { refreshInterval: 30_000, pauseWhenHidden: true }
  );

  const logs = data?.content ?? [];
  const useVirtualization = logs.length > VIRTUALIZATION_THRESHOLD;

  if (error && logs.length === 0) {
    return (
      <div
        className="dh-audit-feed dh-audit-feed--error"
        data-testid="audit-feed-panel"
      >
        <p className="dh-audit-feed__error-message">
          Unable to load audit logs. Please try again later.
        </p>
      </div>
    );
  }

  if (!isValidating && logs.length === 0) {
    return (
      <div
        className="dh-audit-feed dh-audit-feed--empty"
        data-testid="audit-feed-panel"
      >
        <p className="dh-audit-feed__empty-message">
          No audit events recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className="dh-audit-feed" data-testid="audit-feed-panel">
      <div className="dh-audit-feed__header">
        <h3 className="dh-audit-feed__title">Audit Feed</h3>
        <span className="dh-audit-feed__count">
          {logs.length} event{logs.length !== 1 ? "s" : ""}
        </span>
        {isValidating && (
          <span className="dh-audit-feed__loading" aria-live="polite">
            Refreshing…
          </span>
        )}
      </div>

      <div className="dh-audit-feed__list-header">
        <span>Time</span>
        <span>Actor</span>
        <span>Action</span>
        <span>Resource</span>
        <span>Role</span>
      </div>

      {useVirtualization ? (
        <VirtualList
          items={logs}
          itemHeight={ITEM_HEIGHT}
          renderItem={(log) => <AuditRow log={log} />}
          buffer={5}
          className="dh-audit-feed__virtual-list"
          data-testid="audit-feed-virtual-list"
        />
      ) : (
        <div className="dh-audit-feed__simple-list">
          {logs.map((log) => (
            <AuditRow key={log.id} log={log} />
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <div className="dh-audit-feed__pagination">
          <button
            type="button"
            className="dh-audit-feed__load-more"
            onClick={() => {
              const lastLog = logs[logs.length - 1];
              if (lastLog) setCursor(lastLog.id);
            }}
            disabled={isValidating}
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
