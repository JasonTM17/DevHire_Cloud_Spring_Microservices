"use client";

import { forwardRef } from "react";

export type ProgressBarVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info";
export type ProgressBarSize = "sm" | "md" | "lg";

export interface ProgressBarProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Current value (0-100) */
  value?: number;
  /** Maximum value */
  max?: number;
  /** Visual variant */
  variant?: ProgressBarVariant;
  /** Track height size */
  size?: ProgressBarSize;
  /** Show indeterminate animation */
  indeterminate?: boolean;
  /** Label text */
  label?: string;
  /** Show percentage value */
  showValue?: boolean;
  /** Threshold markers (array of percentages) */
  markers?: number[];
  /** Accessible label */
  "aria-label"?: string;
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  function ProgressBar(
    {
      value = 0,
      max = 100,
      variant = "default",
      size = "md",
      indeterminate = false,
      label,
      showValue = false,
      markers,
      className = "",
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    const trackClasses = [
      "dh-progress-track",
      `dh-progress-track--${size}`,
      markers && "dh-progress-track--markers",
    ]
      .filter(Boolean)
      .join(" ");

    const fillClasses = [
      "dh-progress-fill",
      variant !== "default" && `dh-progress-fill--${variant}`,
      indeterminate && "dh-progress-fill--indeterminate",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div ref={ref} className={`dh-progress ${className}`} {...props}>
        {(label || showValue) && (
          <div className="dh-progress-label">
            {label && <span>{label}</span>}
            {showValue && !indeterminate && (
              <span className="dh-progress-value">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        )}
        <div
          className={trackClasses}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : Math.round(percentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={ariaLabel || label}
        >
          <div
            className={fillClasses}
            style={
              indeterminate ? undefined : { width: `${percentage}%` }
            }
          />
          {markers?.map((m) => (
            <span
              key={m}
              className="dh-progress-marker"
              style={{ left: `${m}%` }}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    );
  }
);
