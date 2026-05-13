"use client";

import { useRef, useId, useEffect, type ReactNode } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export type ModalSize = "sm" | "md" | "lg";

export interface ModalProps {
  /** Whether the modal is currently visible */
  isOpen: boolean;
  /** Callback invoked to close the modal */
  onClose: () => void;
  /** Title displayed in the modal header */
  title: string;
  /** Modal content */
  children: ReactNode;
  /** Width variant */
  size?: ModalSize;
  /** Additional class name for the modal panel */
  className?: string;
  /** Test ID for the modal */
  "data-testid"?: string;
}

/**
 * Accessible modal dialog with backdrop overlay.
 * Uses `useFocusTrap` when open, closes on Escape, restores focus on unmount.
 *
 * - `role="dialog"` + `aria-modal="true"`
 * - `aria-labelledby` points to the title element
 * - Backdrop click closes the modal
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  className = "",
  "data-testid": testId,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Focus trap: active when modal is open
  useFocusTrap(panelRef, { enabled: isOpen, onEscape: onClose });

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="dh-modal-backdrop"
      onClick={(e) => {
        // Close on backdrop click (not on panel click)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      data-testid={testId}
    >
      <div
        ref={panelRef}
        className={`dh-modal dh-modal--${size} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="dh-modal__header">
          <h2 id={titleId} className="dh-modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="dh-modal__close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        <div className="dh-modal__body">{children}</div>
      </div>
    </div>
  );
}
