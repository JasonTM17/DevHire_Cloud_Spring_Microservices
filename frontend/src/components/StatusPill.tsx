import { normalizeStatus, statusLabel } from "@/lib/statusLabels";

export { statusLabel } from "@/lib/statusLabels";

export function StatusPill({ value }: { value: string }) {
  const normalized = normalizeStatus(value);
  const className = normalized.toLowerCase().replaceAll("_", "-");
  return <span className={`status status-${className}`}>{statusLabel(normalized)}</span>;
}
