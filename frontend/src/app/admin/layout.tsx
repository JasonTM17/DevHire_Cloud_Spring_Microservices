import type { ReactNode } from "react";
import { OpsDashboardShell } from "@/components/ops/OpsDashboardShell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <OpsDashboardShell>{children}</OpsDashboardShell>;
}
