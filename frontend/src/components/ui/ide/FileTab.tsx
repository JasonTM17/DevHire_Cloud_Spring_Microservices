"use client";

import { useCallback, useRef, type KeyboardEvent } from "react";
import { useIdeState, type EditorTabId } from "@/hooks/useIdeState";

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */

export interface FileTabItem {
  id: EditorTabId;
  label: string;
  readOnly?: boolean;
}

export interface FileTabProps {
  /** Callback when active tab changes — parent should switch the Monaco model */
  onTabChange?: (tabId: EditorTabId) => void;
  className?: string;
  "data-testid"?: string;
}

/* --------------------------------------------------------------------------
   Tab definitions
   -------------------------------------------------------------------------- */

const TABS: FileTabItem[] = [
  { id: "solution", label: "Solution" },
  { id: "visible-tests", label: "Visible Tests", readOnly: true },
  { id: "notes", label: "Notes" },
];

/* --------------------------------------------------------------------------
   FileTab Component
   -------------------------------------------------------------------------- */

/**
 * Tab strip for the IDE editor panel.
 *
 * Renders tabs: Solution | Visible Tests (read-only JSON) | Notes.
 * Switches via a single Monaco instance using multiple `monaco.editor.IModel`.
 * Syncs active tab to localStorage via `useIdeState`.
 *
 * Keyboard navigation:
 * - ArrowLeft/ArrowRight to move focus between tabs
 * - Enter/Space to activate the focused tab
 * - Home/End to jump to first/last tab
 */
export function FileTab({
  onTabChange,
  className = "",
  ...props
}: FileTabProps) {
  const { activeTab, setActiveTab } = useIdeState();
  const tabListRef = useRef<HTMLDivElement>(null);

  const activateTab = useCallback(
    (tabId: EditorTabId) => {
      setActiveTab(tabId);
      onTabChange?.(tabId);
    },
    [setActiveTab, onTabChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = TABS.findIndex((t) => t.id === activeTab);
      let nextIndex = currentIndex;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          nextIndex = (currentIndex + 1) % TABS.length;
          break;
        case "ArrowLeft":
          e.preventDefault();
          nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = TABS.length - 1;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          // Activate the currently focused tab
          activateTab(TABS[currentIndex].id);
          return;
        default:
          return;
      }

      // Move focus and activate the new tab
      const nextTab = TABS[nextIndex];
      activateTab(nextTab.id);

      // Focus the new tab button
      const tabList = tabListRef.current;
      if (tabList) {
        const buttons = tabList.querySelectorAll<HTMLButtonElement>(
          '[role="tab"]'
        );
        buttons[nextIndex]?.focus();
      }
    },
    [activeTab, activateTab]
  );

  const classes = ["dh-file-tab", className].filter(Boolean).join(" ");

  return (
    <div className={classes} data-testid={props["data-testid"]}>
      <div
        ref={tabListRef}
        className="dh-file-tab__list"
        role="tablist"
        aria-label="Editor file tabs"
        onKeyDown={handleKeyDown}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const tabClasses = [
            "dh-file-tab__tab",
            isActive && "dh-file-tab__tab--active",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={tab.id}
              className={tabClasses}
              role="tab"
              id={`file-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`file-tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => activateTab(tab.id)}
            >
              <span className="dh-file-tab__label">{tab.label}</span>
              {tab.readOnly && (
                <span
                  className="dh-file-tab__badge"
                  aria-label="read-only"
                >
                  RO
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
   Exports
   -------------------------------------------------------------------------- */

export { TABS as FILE_TABS };
export type { EditorTabId } from "@/hooks/useIdeState";
