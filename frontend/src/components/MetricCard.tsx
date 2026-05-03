import type { LucideIcon } from "lucide-react";

export function MetricCard({
  label,
  value,
  icon: Icon,
  helper
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  helper?: string;
}) {
  return (
    <div className="metric">
      <span className="metric-icon">
        <Icon size={18} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {helper ? <span>{helper}</span> : null}
      </div>
    </div>
  );
}
