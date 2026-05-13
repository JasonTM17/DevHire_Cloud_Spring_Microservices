import type { CSSProperties, ReactNode } from "react";

type StackDirection = "row" | "column";

type StackProps = {
  direction?: StackDirection;
  gap?: string;
  align?: string;
  justify?: string;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
};

/**
 * Stack — Flex stack (vertical or horizontal) with configurable gap, alignment, and justification.
 * Uses --dh-* design tokens via CSS custom properties.
 */
export function Stack({
  direction = "column",
  gap,
  align,
  justify,
  children,
  className = "",
  "data-testid": testId,
}: StackProps) {
  const style: CSSProperties = {};

  if (direction !== "column") {
    (style as Record<string, string>)["--dh-stack-direction"] = direction;
  }
  if (gap) {
    (style as Record<string, string>)["--dh-stack-gap"] = gap;
  }
  if (align) {
    (style as Record<string, string>)["--dh-stack-align"] = align;
  }
  if (justify) {
    (style as Record<string, string>)["--dh-stack-justify"] = justify;
  }

  return (
    <div
      className={`dh-stack${className ? ` ${className}` : ""}`}
      style={style}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
