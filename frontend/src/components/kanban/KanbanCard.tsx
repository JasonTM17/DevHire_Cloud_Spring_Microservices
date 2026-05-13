"use client";

import { useCallback, type DragEvent, type KeyboardEvent } from "react";
import { Avatar } from "@/components/ui/primitives/Avatar";
import type { Application } from "@/lib/kanban";

export interface KanbanCardProps {
  /** Application data for this card */
  app: Application;
  /** Whether this card is currently selected */
  isSelected: boolean;
  /** Whether this card is currently being dragged */
  isDragging: boolean;
  /** Called when drag starts on this card */
  onDragStart: (appId: string) => void;
  /** Called when drag ends on this card */
  onDragEnd: () => void;
  /** Called when selection is toggled */
  onSelect: (appId: string) => void;
  /** Called for keyboard-based move (Space pick up → Arrow → Space drop → Escape cancel) */
  onKeyboardMove?: (appId: string, direction: "left" | "right") => void;
  /** Called when the card is clicked to open detail */
  onClick?: (appId: string) => void;
}

/**
 * Draggable kanban card representing a single application in the pipeline.
 *
 * Supports:
 * - HTML5 native drag-and-drop via `draggable="true"`
 * - Keyboard alternative: Space to "pick up", ArrowLeft/Right to move, Space to "drop", Escape to cancel
 * - Selection state with visual highlight
 * - Accessible via `role="button"` and `aria-grabbed`
 */
export function KanbanCard({
  app,
  isSelected,
  isDragging,
  onDragStart,
  onDragEnd,
  onSelect,
  onKeyboardMove,
  onClick,
}: KanbanCardProps) {
  const handleDragStart = useCallback(
    (e: DragEvent<HTMLElement>) => {
      e.dataTransfer.setData("text/plain", app.id);
      e.dataTransfer.effectAllowed = "move";
      onDragStart(app.id);
    },
    [app.id, onDragStart]
  );

  const handleDragEnd = useCallback(() => {
    onDragEnd();
  }, [onDragEnd]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      switch (e.key) {
        case " ":
        case "Enter":
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+Space toggles selection
            onSelect(app.id);
          } else {
            onClick?.(app.id);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          onKeyboardMove?.(app.id, "left");
          break;
        case "ArrowRight":
          e.preventDefault();
          onKeyboardMove?.(app.id, "right");
          break;
        default:
          break;
      }
    },
    [app.id, onSelect, onKeyboardMove, onClick]
  );

  const handleCheckboxChange = useCallback(() => {
    onSelect(app.id);
  }, [app.id, onSelect]);

  const handleClick = useCallback(() => {
    onClick?.(app.id);
  }, [app.id, onClick]);

  const classes = [
    "dh-kanban-card",
    isDragging && "dh-kanban-card--dragging",
    isSelected && "dh-kanban-card--selected",
  ]
    .filter(Boolean)
    .join(" ");

  const timeLabel = formatTimeInStage(app.timeInStage);

  return (
    <article
      className={classes}
      draggable="true"
      role="button"
      aria-grabbed={isDragging}
      aria-label={`${app.candidateName} — ${app.jobTitle}`}
      tabIndex={0}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      data-testid={`kanban-card-${app.id}`}
    >
      {/* Selection checkbox */}
      <input
        type="checkbox"
        className="dh-kanban-card__checkbox"
        checked={isSelected}
        onChange={handleCheckboxChange}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select ${app.candidateName}`}
        tabIndex={-1}
      />

      {/* Avatar */}
      <Avatar
        src={app.avatarUrl}
        alt={app.candidateName}
        size="sm"
      />

      {/* Content */}
      <div className="dh-kanban-card__content">
        <div className="dh-kanban-card__name">{app.candidateName}</div>
        <div className="dh-kanban-card__job">{app.jobTitle}</div>
        <div className="dh-kanban-card__meta">
          {app.assessmentScore !== undefined && (
            <span className="dh-kanban-card__score">
              ⚡ {app.assessmentScore}%
            </span>
          )}
          <span className="dh-kanban-card__time">
            🕐 {timeLabel}
          </span>
        </div>
      </div>
    </article>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeInStage(hours: number): string {
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
