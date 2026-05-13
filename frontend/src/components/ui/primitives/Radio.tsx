"use client";

import { forwardRef } from "react";

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Unique id — required for label association */
  id: string;
  /** Visible label text */
  label: string;
  /** Optional description below label */
  description?: string;
  /** Error message to display */
  error?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { id, label, description, error, disabled, className = "", ...props },
  ref
) {
  const errorId = `${id}-error`;
  const wrapperClasses = [
    "dh-radio-wrapper",
    disabled && "dh-radio-wrapper--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapperClasses}>
      <input
        ref={ref}
        type="radio"
        id={id}
        className="dh-radio"
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      <div>
        <label htmlFor={id} className="dh-radio-label">
          {label}
        </label>
        {description && (
          <p className="dh-radio-description">{description}</p>
        )}
        {error && (
          <span id={errorId} className="dh-radio-error" role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
});
