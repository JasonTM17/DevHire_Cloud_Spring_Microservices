"use client";

import { useRef, useId, useEffect, type ReactNode } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export type DrawerPosition = "left" | "right";

export interface DrawerProps {
  /** Whether the drawer is currently visible */
  isOpen: boolean;
  /** Callback invoked to close the drawer */
  onClose: () => void;
  /** Title displayed in the drawer header */
  title: string;
  /** Drawer content */
  children: ReactNode;
  /** Which side the drawer slides in from */
  position?: DrawerPosition;
  /** Additional class name */
  className?: string;
  /** Test ID */
  "data-testid"?: string;
}

/**
 * Accessible slide-in panel (drawer) from left or right.
 * Uses `useFocusTrap` when open, closes on Escape, restores focus on unmount.
 * Backdrop click also closes the drawer.
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  position = "right",
  className = "",
  "data-testid": testId,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Focus trap: active when drawer is open
  useFocusTrap(drawerRef, { enabled: isOpen, onEscape: onClose });

  // Prevent body scroll when drawer is open
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
    <>
      {/* Backdrop */}
      <div
        className="dh-drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={`dh-drawer dh-drawer--${position} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={testId}
      >
        <div className="dh-drawer__header">
          <h2 id={titleId} className="dh-drawer__title">
            {title}
          </h2>
          <button
            type="button"
            className="dh-drawer__close"
            onClick={onClose}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>
        <div className="dh-drawer__body">{children}</div>
      </div>
    </>
  );
}
