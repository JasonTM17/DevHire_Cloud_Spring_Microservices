"use client";

import { forwardRef } from "react";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Unique id — required for label association */
  id: string;
  /** Visible label text */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Input size variant */
  inputSize?: InputSize;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { id, label, error, inputSize = "md", className = "", ...props },
  ref
) {
  const errorId = `${id}-error`;
  const inputClasses = [
    "dh-input",
    inputSize !== "md" && `dh-input--${inputSize}`,
    error && "dh-input--error",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="dh-input-wrapper">
      {label && (
        <label htmlFor={id} className="dh-input-label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={inputClasses}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <span id={errorId} className="dh-input-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
});
