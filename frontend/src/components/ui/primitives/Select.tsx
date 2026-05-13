"use client";

import { forwardRef } from "react";

export type SelectSize = "sm" | "md" | "lg";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Unique id — required for label association */
  id: string;
  /** Visible label text */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Select size variant */
  selectSize?: SelectSize;
  /** Options to render */
  options: SelectOption[];
  /** Placeholder text */
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    {
      id,
      label,
      error,
      selectSize = "md",
      options,
      placeholder,
      className = "",
      ...props
    },
    ref
  ) {
    const errorId = `${id}-error`;
    const selectClasses = [
      "dh-select",
      selectSize !== "md" && `dh-select--${selectSize}`,
      error && "dh-select--error",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="dh-select-wrapper">
        {label && (
          <label htmlFor={id} className="dh-select-label">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={selectClasses}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span id={errorId} className="dh-select-error" role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);
