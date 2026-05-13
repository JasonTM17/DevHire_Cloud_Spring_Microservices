import type { ReactNode } from "react";
import { OpsDashboardShell } from "@/components/ops/OpsDashboardShell";

export default function ObservabilityLayout({ children }: { children: ReactNode }) {
  return <OpsDashboardShell>{children}</OpsDashboardShell>;
}
