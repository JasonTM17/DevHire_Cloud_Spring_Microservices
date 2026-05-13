"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export type PopoverPosition = "top" | "bottom" | "left" | "right";

export interface PopoverProps {
  /** Trigger element that toggles the popover */
  trigger: ReactNode;
  /** Content to display inside the popover */
  content: ReactNode;
  /** Preferred position relative to the trigger */
  position?: PopoverPosition;
  /** Controlled open state (makes component controlled) */
  open?: boolean;
  /** Callback when open state changes (for controlled mode) */
  onOpenChange?: (open: boolean) => void;
  /** Additional class name */
  className?: string;
  /** Test ID */
  "data-testid"?: string;
}

/**
 * Accessible positioned popup component.
 * - Uses `useFocusTrap` when open to keep focus within the popover content
 * - Closes on Escape key press
 * - Restores focus to trigger on close
 * - Closes on outside click
 * - Supports controlled (`open` + `onOpenChange`) and uncontrolled modes
 */
export function Popover({
  trigger,
  content,
  position = "bottom",
  open: controlledOpen,
  onOpenChange,
  className = "",
  "data-testid": testId,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Determine if controlled or uncontrolled
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (isControlled) {
        onOpenChange?.(nextOpen);
      } else {
        setInternalOpen(nextOpen);
      }
    },
    [isControlled, onOpenChange],
  );

  const close = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  // Focus trap: active when popover is open
  useFocusTrap(contentRef, { enabled: isOpen, onEscape: close });

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        contentRef.current &&
        !contentRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        close();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, close]);

  function handleTriggerClick() {
    setOpen(!isOpen);
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(!isOpen);
    }
  }

  return (
    <div className={`dh-popover ${className}`.trim()} data-testid={testId}>
      <button
        ref={triggerRef}
        type="button"
        className="dh-popover__trigger"
        aria-expanded={isOpen}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          ref={contentRef}
          className={`dh-popover__content dh-popover__content--${position}`}
          role="dialog"
          aria-modal="false"
        >
          {content}
        </div>
      )}
    </div>
  );
}
