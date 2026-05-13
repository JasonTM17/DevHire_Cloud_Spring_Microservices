"use client";

import type { ReactNode } from "react";
import "@/styles/components/ops-shell.css";

interface OpsDashboardShellProps {
  children: ReactNode;
}

/**
 * OPS Dashboard shell layout.
 * Forces dark theme via `data-theme-scope="ops-dark"` which activates
 * the ops-dark CSS custom property overrides defined in colors.css.
 *
 * Layout: OpsSidebar on left + content area on right.
 * Sidebar and global status bar are placeholder slots for tasks 12.2 and 12.3.
 */
export function OpsDashboardShell({ children }: OpsDashboardShellProps) {
  return (
    <div className="ops-shell" data-theme-scope="ops-dark">
      <aside className="ops-shell__sidebar" aria-label="OPS navigation">
        {/* OpsSidebar will be mounted here in task 12.2 */}
      </aside>
      <div className="ops-shell__main">
        <header className="ops-shell__status-bar" aria-label="Global status">
          {/* OpsGlobalStatusBar will be mounted here in task 12.3 */}
        </header>
        <div className="ops-shell__content">
          {children}
        </div>
      </div>
    </div>
  );
}
