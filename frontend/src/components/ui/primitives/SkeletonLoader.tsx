"use client";

import { forwardRef } from "react";

export type SkeletonShape = "text" | "heading" | "circle" | "rect";
export type SkeletonSize = "sm" | "md" | "lg";
export type SkeletonAnimation = "pulse" | "wave";

export interface SkeletonLoaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Shape of the skeleton */
  shape?: SkeletonShape;
  /** Predefined height size */
  size?: SkeletonSize;
  /** Animation type */
  animation?: SkeletonAnimation;
  /** Custom width (CSS value) */
  width?: string;
  /** Custom height (CSS value) */
  height?: string;
  /** Accessible label for screen readers */
  "aria-label"?: string;
}

export const SkeletonLoader = forwardRef<HTMLDivElement, SkeletonLoaderProps>(
  function SkeletonLoader(
    {
      shape = "rect",
      size,
      animation = "pulse",
      width,
      height,
      className = "",
      "aria-label": ariaLabel = "Loading...",
      style,
      ...props
    },
    ref
  ) {
    const classes = [
      "dh-skeleton",
      `dh-skeleton--${shape}`,
      size && `dh-skeleton--${size}`,
      animation === "wave" && "dh-skeleton--wave",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        ref={ref}
        className={classes}
        role="status"
        aria-label={ariaLabel}
        aria-busy="true"
        style={{ width, height, ...style }}
        {...props}
      />
    );
  }
);
