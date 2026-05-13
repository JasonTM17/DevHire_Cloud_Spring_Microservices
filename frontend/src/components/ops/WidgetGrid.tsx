"use client";

import type { ReactNode } from "react";
import "@/styles/components/ops-widget-grid.css";

export interface WidgetGridProps {
  children: ReactNode;
  /** Optional CSS class for additional styling */
  className?: string;
}

/**
 * WidgetGrid — Responsive grid layout for OPS dashboard widgets.
 *
 * Uses CSS Grid with `auto-fit` and `minmax(320px, 1fr)` to create
 * a responsive layout that adapts to available space.
 *
 * Requirements: 6.1
 */
export function WidgetGrid({ children, className }: WidgetGridProps) {
  const classes = ["ops-widget-grid", className].filter(Boolean).join(" ");

  return (
    <div className={classes} data-testid="ops-widget-grid">
      {children}
    </div>
  );
}
