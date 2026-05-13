"use client";

import {
  useRef,
  useState,
  useId,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export type DropdownAlign = "left" | "right";

export interface DropdownItem {
  /** Display label for the menu item */
  label: string;
  /** Click handler for the menu item */
  onClick: () => void;
  /** Optional icon element rendered before the label */
  icon?: ReactNode;
}

export interface DropdownProps {
  /** Trigger element that opens the dropdown */
  trigger: ReactNode;
  /** Menu items to display */
  items: DropdownItem[];
  /** Horizontal alignment of the menu relative to the trigger */
  align?: DropdownAlign;
  /** Additional class name */
  className?: string;
  /** Test ID */
  "data-testid"?: string;
}

/**
 * Accessible dropdown menu with keyboard navigation.
 * - `aria-expanded` on trigger indicates open state
 * - `aria-controls` links trigger to menu
 * - `role="menu"` on the menu container
 * - `role="menuitem"` on each item
 * - Arrow keys navigate items, Escape closes, Enter/Space activates
 * - Uses `useFocusTrap` when open; restores focus on close
 */
export function Dropdown({
  trigger,
  items,
  align = "left",
  className = "",
  "data-testid": testId,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const close = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
  }, []);

  // Focus trap: active when dropdown is open
  useFocusTrap(menuRef, { enabled: isOpen, onEscape: close });

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        close();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, close]);

  // Focus the active menu item when focusedIndex changes
  useEffect(() => {
    if (!isOpen || focusedIndex < 0) return;
    const menu = menuRef.current;
    if (!menu) return;
    const menuItems = menu.querySelectorAll<HTMLElement>('[role="menuitem"]');
    menuItems[focusedIndex]?.focus();
  }, [focusedIndex, isOpen]);

  function handleTriggerClick() {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setFocusedIndex(0);
    }
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsOpen(true);
      setFocusedIndex(0);
    }
  }

  function handleMenuKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % items.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + items.length) % items.length);
        break;
      case "Home":
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case "End":
        event.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          items[focusedIndex].onClick();
          close();
        }
        break;
    }
  }

  function handleItemClick(item: DropdownItem) {
    item.onClick();
    close();
  }

  return (
    <div className={`dh-dropdown ${className}`.trim()} data-testid={testId}>
      <button
        ref={triggerRef}
        type="button"
        className="dh-dropdown__trigger"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-haspopup="menu"
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          className={`dh-dropdown__menu dh-dropdown__menu--${align}`}
          role="menu"
          aria-orientation="vertical"
          onKeyDown={handleMenuKeyDown}
        >
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              className="dh-dropdown__item"
              role="menuitem"
              tabIndex={focusedIndex === index ? 0 : -1}
              onClick={() => handleItemClick(item)}
            >
              {item.icon && (
                <span className="dh-dropdown__item-icon" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
