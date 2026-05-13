"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/primitives/Button";
import { Select } from "@/components/ui/primitives/Select";
import { Modal } from "@/components/ui/overlays/Modal";
import type { Stage } from "@/lib/kanban";

export interface KanbanSelectionBarProps {
  /** Number of currently selected cards */
  selectionCount: number;
  /** Called when user confirms bulk move to a stage */
  onBulkMove: (toStage: Stage) => void;
  /** Called when user confirms bulk reject */
  onBulkReject: () => void;
  /** Available stages to move cards to */
  stages: Stage[];
}

type ConfirmAction = "move" | "reject" | null;

/**
 * Floating toolbar that appears when one or more kanban cards are selected.
 *
 * Provides bulk actions:
 * - "Move to..." — Select dropdown to choose target stage, with confirmation modal
 * - "Reject" — Reject all selected, with confirmation modal
 */
export function KanbanSelectionBar({
  selectionCount,
  onBulkMove,
  onBulkReject,
  stages,
}: KanbanSelectionBarProps) {
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [moveTarget, setMoveTarget] = useState<Stage | "">("");

  const handleMoveClick = useCallback(() => {
    if (moveTarget) {
      setConfirmAction("move");
    }
  }, [moveTarget]);

  const handleRejectClick = useCallback(() => {
    setConfirmAction("reject");
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmAction === "move" && moveTarget) {
      onBulkMove(moveTarget as Stage);
    } else if (confirmAction === "reject") {
      onBulkReject();
    }
    setConfirmAction(null);
    setMoveTarget("");
  }, [confirmAction, moveTarget, onBulkMove, onBulkReject]);

  const handleCancel = useCallback(() => {
    setConfirmAction(null);
  }, []);

  if (selectionCount === 0) return null;

  const stageOptions = stages
    .filter((s) => s !== "REJECTED")
    .map((s) => ({
      value: s,
      label: formatStageLabel(s),
    }));

  return (
    <>
      <div
        className="dh-kanban-selection-bar"
        role="toolbar"
        aria-label="Bulk actions"
        data-testid="kanban-selection-bar"
      >
        <span className="dh-kanban-selection-bar__count">
          {selectionCount} selected
        </span>

        <div className="dh-kanban-selection-bar__divider" aria-hidden="true" />

        <div className="dh-kanban-selection-bar__actions">
          {/* Move to stage */}
          <Select
            id="bulk-move-stage"
            options={stageOptions}
            placeholder="Move to..."
            value={moveTarget}
            onChange={(e) => setMoveTarget(e.target.value as Stage)}
            selectSize="sm"
          />
          <Button
            size="sm"
            variant="primary"
            onClick={handleMoveClick}
            disabled={!moveTarget}
          >
            Move
          </Button>

          <div className="dh-kanban-selection-bar__divider" aria-hidden="true" />

          {/* Reject */}
          <Button
            size="sm"
            variant="danger"
            onClick={handleRejectClick}
          >
            Reject
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmAction !== null}
        onClose={handleCancel}
        title={
          confirmAction === "move"
            ? "Confirm Move"
            : "Confirm Rejection"
        }
        size="sm"
      >
        <div>
          <p>
            {confirmAction === "move"
              ? `Move ${selectionCount} application${selectionCount > 1 ? "s" : ""} to "${formatStageLabel(moveTarget as Stage)}"?`
              : `Reject ${selectionCount} application${selectionCount > 1 ? "s" : ""}? This action can be undone.`}
          </p>
          <div style={{ display: "flex", gap: "var(--dh-space-2)", justifyContent: "flex-end", marginTop: "var(--dh-space-4)" }}>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              variant={confirmAction === "reject" ? "danger" : "primary"}
              size="sm"
              onClick={handleConfirm}
            >
              {confirmAction === "move" ? "Move" : "Reject"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatStageLabel(stage: Stage | ""): string {
  if (!stage) return "";
  const labels: Record<Stage, string> = {
    NEW: "New",
    SCREENING: "Screening",
    INTERVIEW: "Interview",
    ASSESSMENT: "Assessment",
    OFFER: "Offer",
    HIRED: "Hired",
    REJECTED: "Rejected",
  };
  return labels[stage] ?? stage;
}
