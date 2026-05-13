"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import "@/styles/components/ops-widget-grid.css";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OpsWidgetProps {
  /** Widget title displayed in the header */
  title: string;
  /** Optional action buttons/elements in the header */
  headerActions?: ReactNode;
  /** Column span: 1 (default) or 2 for wide widgets */
  span?: 1 | 2;
  /** Loading state — shows skeleton placeholder */
  loading?: boolean;
  /** Loading state alias (alternative to `loading`) */
  isLoading?: boolean;
  /** Empty state — shows empty message */
  empty?: boolean;
  /** Custom empty message */
  emptyMessage?: string;
  /** Error state — shows error message with retry */
  error?: Error | null;
  /** Retry callback when error state is shown */
  onRetry?: () => void;
  /** Widget content */
  children: ReactNode;
  /** Optional test id */
  "data-testid"?: string;
}

// ─── Widget Error Boundary ───────────────────────────────────────────────────

interface WidgetErrorBoundaryProps {
  title: string;
  onRetry?: () => void;
  children: ReactNode;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error(`[OpsWidget: ${this.props.title}]`, error, errorInfo.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="ops-widget__error" role="alert">
          <p className="ops-widget__error-message">
            Widget failed to load
          </p>
          {this.props.onRetry && (
            <button
              type="button"
              className="ops-widget__error-retry"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                this.props.onRetry?.();
              }}
            >
              Retry
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── OpsWidget ───────────────────────────────────────────────────────────────

/**
 * OpsWidget — Wrapper component for individual dashboard widgets.
 *
 * Features:
 * - Title header with optional action buttons
 * - Loading skeleton state
 * - Empty state with customizable message
 * - Error state with retry button
 * - Local ErrorBoundary to isolate widget crashes
 * - Column span support (1 or 2 columns)
 *
 * Requirements: 6.2, 11.4
 */
export function OpsWidget({
  title,
  headerActions,
  span = 1,
  loading = false,
  isLoading,
  empty = false,
  emptyMessage = "No data available",
  error = null,
  onRetry,
  children,
  "data-testid": testId,
}: OpsWidgetProps) {
  const spanClass = span === 2 ? " ops-widget--span-2" : "";
  const isLoadingState = loading || isLoading || false;

  return (
    <section
      className={`ops-widget${spanClass}`}
      aria-label={title}
      data-testid={testId ?? `ops-widget-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="ops-widget__header">
        <h3 className="ops-widget__title">{title}</h3>
        {headerActions && (
          <div className="ops-widget__actions">{headerActions}</div>
        )}
      </div>

      <div className="ops-widget__body">
        {isLoadingState ? (
          <WidgetLoadingSkeleton />
        ) : error ? (
          <WidgetErrorState error={error} onRetry={onRetry} />
        ) : empty ? (
          <WidgetEmptyState message={emptyMessage} />
        ) : (
          <WidgetErrorBoundary title={title} onRetry={onRetry}>
            {children}
          </WidgetErrorBoundary>
        )}
      </div>
    </section>
  );
}

// ─── Internal sub-components ─────────────────────────────────────────────────

function WidgetLoadingSkeleton() {
  return (
    <div className="ops-widget__skeleton" aria-busy="true" aria-label="Loading widget">
      <div className="ops-widget__skeleton-line ops-widget__skeleton-line--wide" />
      <div className="ops-widget__skeleton-line ops-widget__skeleton-line--medium" />
      <div className="ops-widget__skeleton-line ops-widget__skeleton-line--narrow" />
    </div>
  );
}

function WidgetErrorState({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: () => void;
}) {
  return (
    <div className="ops-widget__error" role="alert">
      <p className="ops-widget__error-message">
        {error.message || "Failed to load widget data"}
      </p>
      {onRetry && (
        <button
          type="button"
          className="ops-widget__error-retry"
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </div>
  );
}

function WidgetEmptyState({ message }: { message: string }) {
  return (
    <div className="ops-widget__empty">
      <p className="ops-widget__empty-message">{message}</p>
    </div>
  );
}
