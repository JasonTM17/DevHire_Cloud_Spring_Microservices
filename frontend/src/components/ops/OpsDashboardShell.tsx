"use client";

import type { ReactNode } from "react";
import { OpsSidebar } from "./OpsSidebar";
import { OpsGlobalStatusBar } from "./OpsGlobalStatusBar";
import "@/styles/components/ops-shell.css";

export interface OpsDashboardShellProps {
  children: ReactNode;
}

/**
 * OPS Dashboard shell layout.
 * Forces dark theme via `data-theme-scope="ops-dark"` which activates
 * the ops-dark CSS custom property overrides defined in colors.css.
 *
 * Layout: OpsSidebar (left) + OpsGlobalStatusBar (top) + OpsPageContent (main).
 *
 * Requirements: 6.1, 6.5
 */
export function OpsDashboardShell({ children }: OpsDashboardShellProps) {
  return (
    <div className="ops-shell" data-theme-scope="ops-dark">
      <aside className="ops-shell__sidebar" aria-label="OPS navigation">
        <OpsSidebar />
      </aside>
      <div className="ops-shell__main">
        <header className="ops-shell__status-bar" aria-label="Global status">
          <OpsGlobalStatusBar />
        </header>
        <main className="ops-shell__content" id="ops-main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
