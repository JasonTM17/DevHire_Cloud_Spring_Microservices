"use client";

import { useCallback, useState, type DragEvent } from "react";
import { KanbanCard } from "./KanbanCard";
import type { Application, Stage } from "@/lib/kanban";

export interface KanbanColumnProps {
  /** Pipeline stage this column represents */
  stage: Stage;
  /** Applications currently in this stage */
  apps: Application[];
  /** Whether a card is currently being dragged over this column */
  isDropTarget: boolean;
  /** Set of selected application IDs */
  selectedIds: Set<string>;
  /** ID of the currently dragging card (to show dragging state) */
  draggingId?: string;
  /** Called when a card starts being dragged */
  onDragStart: (appId: string) => void;
  /** Called when drag ends */
  onDragEnd: () => void;
  /** Called when a card is dropped on this column */
  onDrop: (stage: Stage) => void;
  /** Called when drag enters this column */
  onDragEnter: (stage: Stage) => void;
  /** Called when drag leaves this column */
  onDragLeave: () => void;
  /** Called when a card's selection is toggled */
  onSelect: (appId: string) => void;
  /** Called for keyboard-based card movement */
  onKeyboardMove?: (appId: string, direction: "left" | "right") => void;
  /** Called when a card is clicked to open detail */
  onCardClick?: (appId: string) => void;
}

/**
 * A single column in the Kanban board representing a pipeline stage.
 *
 * Handles HTML5 drag-and-drop events (dragOver, dragEnter, dragLeave, drop)
 * and renders a list of KanbanCards with a drop indicator when active.
 */
export function KanbanColumn({
  stage,
  apps,
  isDropTarget,
  selectedIds,
  draggingId,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragEnter,
  onDragLeave,
  onSelect,
  onKeyboardMove,
  onCardClick,
}: KanbanColumnProps) {
  const [localDropTarget, setLocalDropTarget] = useState(false);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setLocalDropTarget(true);
      onDragEnter(stage);
    },
    [stage, onDragEnter]
  );

  const handleDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      // Only trigger leave if we're actually leaving the column (not entering a child)
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setLocalDropTarget(false);
      onDragLeave();
    },
    [onDragLeave]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setLocalDropTarget(false);
      onDrop(stage);
    },
    [stage, onDrop]
  );

  const showDropIndicator = isDropTarget || localDropTarget;

  const columnClasses = [
    "dh-kanban-column",
    showDropIndicator && "dh-kanban-column--drop-target",
  ]
    .filter(Boolean)
    .join(" ");

  const stageLabel = formatStageLabel(stage);

  return (
    <div
      className={columnClasses}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      aria-label={`${stageLabel} column, ${apps.length} applications`}
      data-testid={`kanban-column-${stage}`}
    >
      {/* Column header */}
      <div className="dh-kanban-column__header">
        <span className="dh-kanban-column__title">{stageLabel}</span>
        <span className="dh-kanban-column__count" aria-label={`${apps.length} items`}>
          {apps.length}
        </span>
      </div>

      {/* Card list */}
      <div className="dh-kanban-column__list" role="list">
        {showDropIndicator && (
          <div className="dh-kanban-column__drop-indicator" aria-hidden="true" />
        )}

        {apps.length === 0 && !showDropIndicator && (
          <div className="dh-kanban-column__empty">
            No applications
          </div>
        )}

        {apps.map((app) => (
          <KanbanCard
            key={app.id}
            app={app}
            isSelected={selectedIds.has(app.id)}
            isDragging={draggingId === app.id}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onSelect={onSelect}
            onKeyboardMove={onKeyboardMove}
            onClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatStageLabel(stage: Stage): string {
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
