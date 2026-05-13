"use client";

import { forwardRef } from "react";

export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";
export type SpinnerColor = "brand" | "accent" | "inverse";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size variant */
  size?: SpinnerSize;
  /** Color variant */
  color?: SpinnerColor;
  /** Accessible label */
  label?: string;
}

export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  function Spinner(
    {
      size = "md",
      color = "brand",
      label = "Loading...",
      className = "",
      ...props
    },
    ref
  ) {
    const classes = [
      "dh-spinner",
      `dh-spinner--${size}`,
      `dh-spinner--${color}`,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    if (label) {
      return (
        <div
          ref={ref}
          className="dh-spinner-container"
          role="status"
          aria-label={label}
          {...props}
        >
          <span className={classes}>
            <span className="dh-spinner-circle" aria-hidden="true" />
          </span>
          <span className="dh-spinner-label">{label}</span>
        </div>
      );
    }

    return (
      <span
        ref={ref}
        className={classes}
        role="status"
        aria-label="Loading"
        {...props}
      >
        <span className="dh-spinner-circle" aria-hidden="true" />
      </span>
    );
  }
);
