import type { LucideIcon } from "lucide-react";

export function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <div className="metric">
      <Icon size={18} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
