"use client";

import { useState, useRef, useCallback } from "react";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  /** Tooltip content */
  content: React.ReactNode;
  /** Position relative to trigger */
  position?: TooltipPosition;
  /** Allow multiline content */
  multiline?: boolean;
  /** Delay before showing (ms) */
  delay?: number;
  /** The trigger element */
  children: React.ReactElement;
}

export function Tooltip({
  content,
  position = "top",
  multiline = false,
  delay = 200,
  children,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useRef(
    `tooltip-${Math.random().toString(36).slice(2, 9)}`
  ).current;

  const show = useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setVisible(false);
  }, []);

  const tooltipClasses = [
    "dh-tooltip",
    `dh-tooltip--${position}`,
    visible && "dh-tooltip--visible",
    multiline && "dh-tooltip--multiline",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className="dh-tooltip-trigger"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <span aria-describedby={visible ? tooltipId : undefined}>
        {children}
      </span>
      <span id={tooltipId} role="tooltip" className={tooltipClasses}>
        {content}
      </span>
    </span>
  );
}
