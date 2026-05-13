"use client";

import { forwardRef } from "react";

export type IconButtonSize = "sm" | "md" | "lg";
export type IconButtonVariant = "ghost" | "filled";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { size = "md", variant = "ghost", className = "", children, ...props },
    ref
  ) {
    const classes = [
      "dh-icon-btn",
      `dh-icon-btn--${size}`,
      `dh-icon-btn--${variant}`,
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button ref={ref} className={classes} type="button" {...props}>
        {children}
      </button>
    );
  }
);
