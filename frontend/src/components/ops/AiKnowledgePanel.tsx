"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives/Button";
import { ProgressBar } from "@/components/ui/primitives/ProgressBar";
import { OpsWidget } from "./OpsWidget";
import "@/styles/components/ai-ops-panels.css";

export interface AiKnowledgeStatus {
  totalDocuments: number;
  totalChunks: number;
  lastReindexAt: string | null;
}

export interface AiKnowledgePanelProps {
  knowledge: AiKnowledgeStatus;
  onReindex: () => Promise<void>;
  loading?: boolean;
  "data-testid"?: string;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  return date.toLocaleString();
}

/**
 * AiKnowledgePanel — Displays knowledge base statistics and provides
 * a reindex action with progress indication.
 *
 * Wrapped in OpsWidget for consistent dark theme styling and error isolation.
 *
 * Requirements: 8.3, 8.4
 */
export function AiKnowledgePanel({
  knowledge,
  onReindex,
  loading = false,
  "data-testid": testId,
}: AiKnowledgePanelProps) {
  const [isReindexing, setIsReindexing] = useState(false);
  const [reindexError, setReindexError] = useState<string | null>(null);

  async function handleReindex() {
    setIsReindexing(true);
    setReindexError(null);
    try {
      await onReindex();
    } catch (err) {
      setReindexError(
        err instanceof Error ? err.message : "Reindex failed"
      );
    } finally {
      setIsReindexing(false);
    }
  }

  const headerActions = (
    <Button
      size="sm"
      variant="secondary"
      onClick={handleReindex}
      disabled={isReindexing}
      aria-label="Reindex knowledge base"
      data-testid="reindex-button"
    >
      {isReindexing ? "Reindexing…" : "Reindex"}
    </Button>
  );

  return (
    <OpsWidget
      title="Knowledge Base"
      headerActions={headerActions}
      loading={loading}
      data-testid={testId ?? "ai-knowledge-panel"}
    >
      <div className="dh-ai-knowledge-panel">
        {isReindexing && (
          <div
            className="dh-ai-knowledge-panel__progress"
            data-testid="reindex-progress"
          >
            <ProgressBar
              indeterminate
              size="sm"
              variant="info"
              aria-label="Reindexing in progress"
            />
          </div>
        )}

        {reindexError && (
          <p
            className="dh-ai-knowledge-panel__error"
            role="alert"
            data-testid="reindex-error"
          >
            {reindexError}
          </p>
        )}

        <dl className="dh-ai-knowledge-panel__fields">
          <div className="dh-ai-knowledge-panel__field">
            <dt>Total Documents</dt>
            <dd data-testid="total-documents">
              {knowledge.totalDocuments.toLocaleString()}
            </dd>
          </div>
          <div className="dh-ai-knowledge-panel__field">
            <dt>Total Chunks</dt>
            <dd data-testid="total-chunks">
              {knowledge.totalChunks.toLocaleString()}
            </dd>
          </div>
          <div className="dh-ai-knowledge-panel__field">
            <dt>Last Reindex</dt>
            <dd data-testid="last-reindex-at">
              {formatTimestamp(knowledge.lastReindexAt)}
            </dd>
          </div>
        </dl>
      </div>
    </OpsWidget>
  );
}
