import type { CSSProperties } from "react";

type DividerOrientation = "horizontal" | "vertical";

type DividerProps = {
  orientation?: DividerOrientation;
  spacing?: string;
  className?: string;
  "data-testid"?: string;
};

/**
 * Divider — Horizontal or vertical divider line.
 * Uses --dh-* design tokens for border color and spacing.
 */
export function Divider({
  orientation = "horizontal",
  spacing,
  className = "",
  "data-testid": testId,
}: DividerProps) {
  const style: CSSProperties = {};

  if (spacing) {
    (style as Record<string, string>)["--dh-divider-spacing"] = spacing;
  }

  return (
    <hr
      className={`dh-divider dh-divider--${orientation}${className ? ` ${className}` : ""}`}
      style={style}
      data-testid={testId}
      role={orientation === "vertical" ? "separator" : undefined}
      aria-orientation={orientation === "vertical" ? "vertical" : undefined}
    />
  );
}
