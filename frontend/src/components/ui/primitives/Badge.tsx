"use client";

import { forwardRef } from "react";

export type BadgeVariant =
  | "default"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "easy"
  | "medium"
  | "hard";

export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Show a dot indicator before the text */
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = "default", size = "md", dot = false, className = "", children, ...props },
  ref
) {
  const classes = [
    "dh-badge",
    `dh-badge--${variant}`,
    size !== "md" && `dh-badge--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span ref={ref} className={classes} {...props}>
      {dot && <span className="dh-badge-dot" aria-hidden="true" />}
      {children}
    </span>
  );
});
