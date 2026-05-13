"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  groupByStage,
  moveCardReducer,
  toggleSelection,
  type Application,
  type KanbanState,
  type PendingMutation,
  type Stage,
} from "@/lib/kanban";
import { useToast } from "@/components/ui/feedback";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DraggingState {
  cardId: string;
  fromStage: Stage;
}

export interface KanbanBoardState {
  columns: Record<Stage, Application[]>;
  selection: Set<string>;
  dragging?: DraggingState;
  pendingMutations: PendingMutation[];
}

export interface UseKanbanBoardProps {
  initialApps: Application[];
  stages: Stage[];
  onMutate?: (mutation: PendingMutation) => Promise<void>;
}

export interface UseKanbanBoardReturn {
  state: KanbanBoardState;
  startDrag: (cardId: string, fromStage: Stage) => void;
  enterColumn: (stage: Stage) => void;
  drop: (toStage: Stage) => void;
  cancelDrag: () => void;
  toggleSelect: (id: string) => void;
  bulkMove: (toStage: Stage) => void;
  bulkReject: () => void;
  ack: (mutationId: string) => void;
  rollback: (mutationId: string) => void;
}

// ─── Helper: mutation identifier ─────────────────────────────────────────────

function getMutationId(mutation: PendingMutation): string {
  return `${mutation.cardId}-${mutation.timestamp}`;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * useKanbanBoard — State machine hook for the employer Kanban pipeline.
 *
 * Manages columns, selection, drag state, and optimistic mutations.
 * Uses pure functions from `@/lib/kanban` for state transitions.
 */
export function useKanbanBoard({
  initialApps,
  stages,
  onMutate,
}: UseKanbanBoardProps): UseKanbanBoardReturn {
  const { toast } = useToast();

  // Core kanban state (columns + pendingMutations)
  const [kanbanState, setKanbanState] = useState<KanbanState>(() => ({
    columns: groupByStage(initialApps, stages),
    pendingMutations: [],
  }));

  // Selection state
  const [selection, setSelection] = useState<Set<string>>(new Set());

  // Dragging state
  const [dragging, setDragging] = useState<DraggingState | undefined>(undefined);

  // Track snapshots for rollback (mutationId → previous state)
  const snapshotsRef = useRef<Map<string, KanbanState>>(new Map());

  // ─── Actions ─────────────────────────────────────────────────────────────

  const startDrag = useCallback((cardId: string, fromStage: Stage) => {
    setDragging({ cardId, fromStage });
  }, []);

  const enterColumn = useCallback((_stage: Stage) => {
    // Visual feedback only — handled by the column component via CSS.
    // No state change needed here; the column can use the dragging state
    // to determine if it should show a drop indicator.
  }, []);

  const cancelDrag = useCallback(() => {
    setDragging(undefined);
  }, []);

  const drop = useCallback(
    (toStage: Stage) => {
      setDragging((currentDragging) => {
        if (!currentDragging) return undefined;

        const { cardId } = currentDragging;

        // Perform optimistic update
        setKanbanState((prev) => {
          const snapshot = prev;
          const next = moveCardReducer(prev, { type: "MOVE_CARD", cardId, toStage });

          // If state didn't change (card not found or already in target), skip API call
          if (next === prev) return prev;

          // Find the newly appended mutation
          const newMutation = next.pendingMutations[next.pendingMutations.length - 1];
          const mutId = getMutationId(newMutation);

          // Store snapshot for potential rollback
          snapshotsRef.current.set(mutId, snapshot);

          // Fire API call (non-blocking)
          if (onMutate) {
            onMutate(newMutation)
              .then(() => {
                // On success, acknowledge the mutation
                setKanbanState((s) => ({
                  ...s,
                  pendingMutations: s.pendingMutations.filter(
                    (m) => getMutationId(m) !== mutId
                  ),
                }));
                snapshotsRef.current.delete(mutId);
              })
              .catch(() => {
                // On failure, rollback
                const savedSnapshot = snapshotsRef.current.get(mutId);
                if (savedSnapshot) {
                  setKanbanState((s) => ({
                    ...savedSnapshot,
                    pendingMutations: s.pendingMutations.filter(
                      (m) => getMutationId(m) !== mutId
                    ),
                  }));
                  snapshotsRef.current.delete(mutId);
                }
                toast({
                  variant: "error",
                  title: "Move failed",
                  description: `Could not move card to ${toStage}. The change has been reverted.`,
                });
              });
          }

          return next;
        });

        // Clear dragging state
        return undefined;
      });
    },
    [onMutate, toast]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelection((prev) => toggleSelection(prev, id));
  }, []);

  const bulkMove = useCallback(
    (toStage: Stage) => {
      setSelection((currentSelection) => {
        if (currentSelection.size === 0) return currentSelection;

        const cardIds = Array.from(currentSelection);

        for (const cardId of cardIds) {
          setKanbanState((prev) => {
            const snapshot = prev;
            const next = moveCardReducer(prev, { type: "MOVE_CARD", cardId, toStage });

            if (next === prev) return prev;

            const newMutation = next.pendingMutations[next.pendingMutations.length - 1];
            const mutId = getMutationId(newMutation);

            snapshotsRef.current.set(mutId, snapshot);

            if (onMutate) {
              onMutate(newMutation)
                .then(() => {
                  setKanbanState((s) => ({
                    ...s,
                    pendingMutations: s.pendingMutations.filter(
                      (m) => getMutationId(m) !== mutId
                    ),
                  }));
                  snapshotsRef.current.delete(mutId);
                })
                .catch(() => {
                  const savedSnapshot = snapshotsRef.current.get(mutId);
                  if (savedSnapshot) {
                    setKanbanState((s) => ({
                      ...savedSnapshot,
                      pendingMutations: s.pendingMutations.filter(
                        (m) => getMutationId(m) !== mutId
                      ),
                    }));
                    snapshotsRef.current.delete(mutId);
                  }
                  toast({
                    variant: "error",
                    title: "Bulk move failed",
                    description: `Could not move card ${cardId} to ${toStage}. The change has been reverted.`,
                  });
                });
            }

            return next;
          });
        }

        // Clear selection after bulk move
        return new Set<string>();
      });
    },
    [onMutate, toast]
  );

  const bulkReject = useCallback(() => {
    bulkMove("REJECTED");
  }, [bulkMove]);

  const ack = useCallback((mutationId: string) => {
    setKanbanState((prev) => ({
      ...prev,
      pendingMutations: prev.pendingMutations.filter(
        (m) => getMutationId(m) !== mutationId
      ),
    }));
    snapshotsRef.current.delete(mutationId);
  }, []);

  const rollback = useCallback(
    (mutationId: string) => {
      const snapshot = snapshotsRef.current.get(mutationId);
      if (snapshot) {
        setKanbanState((prev) => ({
          ...snapshot,
          pendingMutations: prev.pendingMutations.filter(
            (m) => getMutationId(m) !== mutationId
          ),
        }));
        snapshotsRef.current.delete(mutationId);
      }
      toast({
        variant: "error",
        title: "Move failed",
        description: "The change has been reverted due to a server error.",
      });
    },
    [toast]
  );

  // ─── Composed state ──────────────────────────────────────────────────────

  const state: KanbanBoardState = useMemo(
    () => ({
      columns: kanbanState.columns,
      selection,
      dragging,
      pendingMutations: kanbanState.pendingMutations,
    }),
    [kanbanState.columns, kanbanState.pendingMutations, selection, dragging]
  );

  return {
    state,
    startDrag,
    enterColumn,
    drop,
    cancelDrag,
    toggleSelect,
    bulkMove,
    bulkReject,
    ack,
    rollback,
  };
}
