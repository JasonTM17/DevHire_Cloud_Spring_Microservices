type StatusDotProps = {
  status: "healthy" | "degraded" | "critical" | "unknown";
  size?: "sm" | "md" | "lg";
  className?: string;
  "data-testid"?: string;
};

const statusLabels: Record<StatusDotProps["status"], string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  critical: "Critical",
  unknown: "Awaiting signal",
};

export function StatusDot({
  status,
  size = "md",
  className = "",
  "data-testid": testId,
}: StatusDotProps) {
  return (
    <span
      className={`dh-status-dot dh-status-dot--${status} dh-status-dot--${size} ${className}`}
      role="img"
      aria-label={statusLabels[status]}
      data-testid={testId}
    />
  );
}
