import type { CSSProperties, ReactNode } from "react";

type GridProps = {
  columns?: number | string;
  gap?: string;
  minChildWidth?: string;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
};

/**
 * Grid — CSS Grid wrapper with configurable columns, gap, and responsive auto-fit.
 * Uses --dh-* design tokens via CSS custom properties.
 *
 * When `minChildWidth` is provided, uses `repeat(auto-fit, minmax(minChildWidth, 1fr))`
 * for responsive column layout. Otherwise uses the `columns` prop.
 */
export function Grid({
  columns,
  gap,
  minChildWidth,
  children,
  className = "",
  "data-testid": testId,
}: GridProps) {
  const useAutoFit = !!minChildWidth;

  const style: CSSProperties = {};

  if (gap) {
    (style as Record<string, string>)["--dh-grid-gap"] = gap;
  }

  if (useAutoFit) {
    (style as Record<string, string>)["--dh-grid-min-child-width"] = minChildWidth;
  } else if (columns !== undefined) {
    const columnsValue =
      typeof columns === "number" ? `repeat(${columns}, 1fr)` : columns;
    (style as Record<string, string>)["--dh-grid-columns"] = columnsValue;
  }

  const autoFitClass = useAutoFit ? " dh-grid--auto-fit" : "";

  return (
    <div
      className={`dh-grid${autoFitClass}${className ? ` ${className}` : ""}`}
      style={style}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
