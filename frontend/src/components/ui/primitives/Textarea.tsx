"use client";

import { forwardRef } from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Unique id — required for label association */
  id: string;
  /** Visible label text */
  label?: string;
  /** Error message to display */
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ id, label, error, className = "", ...props }, ref) {
    const errorId = `${id}-error`;
    const textareaClasses = [
      "dh-textarea",
      error && "dh-textarea--error",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="dh-textarea-wrapper">
        {label && (
          <label htmlFor={id} className="dh-textarea-label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={textareaClasses}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        {error && (
          <span id={errorId} className="dh-textarea-error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);
