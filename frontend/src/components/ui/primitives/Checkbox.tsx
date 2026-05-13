"use client";

import { forwardRef } from "react";

export interface CheckboxProps
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

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    { id, label, description, error, disabled, className = "", ...props },
    ref
  ) {
    const errorId = `${id}-error`;
    const wrapperClasses = [
      "dh-checkbox-wrapper",
      disabled && "dh-checkbox-wrapper--disabled",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={wrapperClasses}>
        <input
          ref={ref}
          type="checkbox"
          id={id}
          className="dh-checkbox"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
        <div>
          <label htmlFor={id} className="dh-checkbox-label">
            {label}
          </label>
          {description && (
            <p className="dh-checkbox-description">{description}</p>
          )}
          {error && (
            <span id={errorId} className="dh-checkbox-error" role="alert">
              {error}
            </span>
          )}
        </div>
      </div>
    );
  }
);
