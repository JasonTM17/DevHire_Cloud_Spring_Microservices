"use client";

import { forwardRef } from "react";

export type TagVariant =
  | "default"
  | "brand"
  | "neutral"
  | "success"
  | "warning"
  | "danger";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant;
  /** If provided, renders a remove button */
  onRemove?: () => void;
  /** Accessible label for the remove button */
  removeLabel?: string;
}

export const Tag = forwardRef<HTMLSpanElement, TagProps>(function Tag(
  {
    variant = "default",
    onRemove,
    removeLabel = "Remove",
    className = "",
    children,
    ...props
  },
  ref
) {
  const classes = [
    "dh-tag",
    `dh-tag--${variant}`,
    onRemove && "dh-tag--removable",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span ref={ref} className={classes} {...props}>
      {children}
      {onRemove && (
        <button
          type="button"
          className="dh-tag-remove"
          onClick={onRemove}
          aria-label={removeLabel}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M9 3L3 9M3 3l6 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </span>
  );
});
