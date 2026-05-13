"use client";

import { useCallback, useMemo, useState } from "react";
import { useDataFetcher } from "@/hooks/useDataFetcher";
import { useKanbanBoard } from "@/hooks/useKanbanBoard";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { KanbanSelectionBar } from "@/components/kanban/KanbanSelectionBar";
import { ApplicationDetailDrawer } from "@/components/kanban/ApplicationDetailDrawer";
import { SkeletonLoader } from "@/components/ui/primitives/SkeletonLoader";
import { ErrorState } from "@/components/ui/feedback/ErrorState";
import type { Application, Stage } from "@/lib/kanban";

// ─── Constants ───────────────────────────────────────────────────────────────

const PIPELINE_STAGES: Stage[] = [
  "NEW",
  "SCREENING",
  "INTERVIEW",
  "ASSESSMENT",
  "OFFER",
  "HIRED",
  "REJECTED",
];

// ─── Data fetcher ────────────────────────────────────────────────────────────

async function fetchPipelineApplications(): Promise<Application[]> {
  const res = await fetch("/api/employer/pipeline/applications");
  if (!res.ok) throw new Error("Failed to fetch pipeline data");
  return res.json();
}

async function mutateApplication(mutation: {
  cardId: string;
  fromStage: Stage;
  toStage: Stage;
}): Promise<void> {
  const res = await fetch(`/api/employer/pipeline/applications/${mutation.cardId}/stage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage: mutation.toStage }),
  });
  if (!res.ok) throw new Error("Failed to update application stage");
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function EmployerPipelinePage() {
  const { data, error, isValidating } = useDataFetcher<Application[]>(
    "employer-pipeline-apps",
    fetchPipelineApplications,
    { revalidateOnFocus: true }
  );

  // Loading state
  if (!data && isValidating) {
    return <PipelineSkeleton />;
  }

  // Error state
  if (error && !data) {
    return (
      <div className="dh-pipeline">
        <ErrorState
          variant="network"
          title="Failed to load pipeline"
          message="Could not fetch application data. Please try again."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return <PipelineBoard initialApps={data ?? []} />;
}

// ─── Pipeline Board (with hook) ──────────────────────────────────────────────

function PipelineBoard({ initialApps }: { initialApps: Application[] }) {
  const [detailApp, setDetailApp] = useState<Application | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    state,
    startDrag,
    enterColumn,
    drop,
    cancelDrag,
    toggleSelect,
    bulkMove,
    bulkReject,
  } = useKanbanBoard({
    initialApps,
    stages: PIPELINE_STAGES,
    onMutate: mutateApplication,
  });

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleDragStart = useCallback(
    (appId: string) => {
      // Find which stage the card is in
      for (const stage of PIPELINE_STAGES) {
        const found = state.columns[stage]?.find((a) => a.id === appId);
        if (found) {
          startDrag(appId, stage);
          break;
        }
      }
    },
    [state.columns, startDrag]
  );

  const handleDragEnd = useCallback(() => {
    cancelDrag();
  }, [cancelDrag]);

  const handleDrop = useCallback(
    (stage: Stage) => {
      drop(stage);
    },
    [drop]
  );

  const handleDragEnter = useCallback(
    (stage: Stage) => {
      enterColumn(stage);
    },
    [enterColumn]
  );

  const handleDragLeave = useCallback(() => {
    // Visual only — handled by column local state
  }, []);

  const handleCardClick = useCallback(
    (appId: string) => {
      // Find the application across all columns
      for (const stage of PIPELINE_STAGES) {
        const found = state.columns[stage]?.find((a) => a.id === appId);
        if (found) {
          setDetailApp(found);
          setDrawerOpen(true);
          break;
        }
      }
    },
    [state.columns]
  );

  const handleKeyboardMove = useCallback(
    (appId: string, direction: "left" | "right") => {
      // Find current stage index
      const currentStageIndex = PIPELINE_STAGES.findIndex((stage) =>
        state.columns[stage]?.some((a) => a.id === appId)
      );
      if (currentStageIndex === -1) return;

      const targetIndex =
        direction === "left" ? currentStageIndex - 1 : currentStageIndex + 1;
      if (targetIndex < 0 || targetIndex >= PIPELINE_STAGES.length) return;

      const fromStage = PIPELINE_STAGES[currentStageIndex];
      const toStage = PIPELINE_STAGES[targetIndex];

      startDrag(appId, fromStage);
      drop(toStage);
    },
    [state.columns, startDrag, drop]
  );

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDetailApp(null);
  }, []);

  // ─── Derived state ───────────────────────────────────────────────────────

  const draggingId = state.dragging?.cardId;

  const visibleStages = useMemo(
    () => PIPELINE_STAGES.filter((s) => s !== "REJECTED"),
    []
  );

  return (
    <div className="dh-pipeline">
      {/* Header */}
      <div className="dh-pipeline__header">
        <h1 className="dh-pipeline__title">Hiring Pipeline</h1>
      </div>

      {/* Kanban Board */}
      <div className="dh-pipeline__board">
        <div className="dh-kanban">
          {visibleStages.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              apps={state.columns[stage] ?? []}
              isDropTarget={state.dragging?.cardId !== undefined && false}
              selectedIds={state.selection}
              draggingId={draggingId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onSelect={toggleSelect}
              onKeyboardMove={handleKeyboardMove}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
      </div>

      {/* Selection Bar (bulk actions) */}
      <KanbanSelectionBar
        selectionCount={state.selection.size}
        onBulkMove={bulkMove}
        onBulkReject={bulkReject}
        stages={PIPELINE_STAGES}
      />

      {/* Application Detail Drawer */}
      <ApplicationDetailDrawer
        app={detailApp}
        open={drawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function PipelineSkeleton() {
  return (
    <div className="dh-pipeline">
      <div className="dh-pipeline__header">
        <SkeletonLoader shape="heading" width="200px" aria-label="Loading pipeline title" />
      </div>
      <div className="dh-pipeline__skeleton">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="dh-pipeline__skeleton-column">
            <SkeletonLoader shape="text" width="80px" aria-label="Loading column header" />
            <SkeletonLoader shape="rect" height="80px" aria-label="Loading card" />
            <SkeletonLoader shape="rect" height="80px" aria-label="Loading card" />
            <SkeletonLoader shape="rect" height="80px" aria-label="Loading card" />
          </div>
        ))}
      </div>
    </div>
  );
}
