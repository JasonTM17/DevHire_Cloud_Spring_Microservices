"use client";

import { forwardRef } from "react";

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Unique id — required for label association */
  id: string;
  /** Visible label text */
  label: string;
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { id, label, disabled, className = "", checked, ...props },
  ref
) {
  const wrapperClasses = [
    "dh-switch-wrapper",
    disabled && "dh-switch-wrapper--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <label htmlFor={id} className={wrapperClasses}>
      <span className="dh-switch">
        <input
          ref={ref}
          type="checkbox"
          role="switch"
          id={id}
          className="dh-switch-input"
          disabled={disabled}
          checked={checked}
          aria-checked={checked}
          {...props}
        />
        <span className="dh-switch-track" aria-hidden="true" />
        <span className="dh-switch-thumb" aria-hidden="true" />
      </span>
      <span className="dh-switch-label">{label}</span>
    </label>
  );
});
