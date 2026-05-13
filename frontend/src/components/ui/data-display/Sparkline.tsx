type SparklineProps = {
  points: number[];
  width?: number;
  height?: number;
  ariaLabel: string;
  color?: string;
  className?: string;
  "data-testid"?: string;
};

export function Sparkline({
  points,
  width = 240,
  height = 48,
  ariaLabel,
  color,
  className = "",
  "data-testid": testId,
}: SparklineProps) {
  if (points.length === 0) {
    return (
      <div
        className={`dh-sparkline dh-sparkline--empty ${className}`}
        role="img"
        aria-label={ariaLabel}
        data-testid={testId}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="dh-sparkline__svg"
        >
          <line
            x1={0}
            y1={height / 2}
            x2={width}
            y2={height / 2}
            stroke="var(--dh-color-border-default)"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        </svg>
      </div>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const padding = 2;
  const chartHeight = height - padding * 2;
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;

  const pathData = points
    .map((point, i) => {
      const x = i * stepX;
      const y = padding + chartHeight - ((point - min) / range) * chartHeight;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div
      className={`dh-sparkline ${className}`}
      role="img"
      aria-label={ariaLabel}
      data-testid={testId}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="dh-sparkline__svg"
        aria-hidden="true"
      >
        <path
          d={pathData}
          fill="none"
          stroke={color ?? "var(--dh-color-ops-accent, var(--dh-color-accent))"}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
