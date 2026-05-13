"use client";

import { useState, useCallback, useRef, type KeyboardEvent } from "react";

type TabItem = {
  id: string;
  label: string;
  content: React.ReactNode;
};

type TabsProps = {
  tabs: TabItem[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
  "data-testid"?: string;
};

export function Tabs({
  tabs,
  defaultTab,
  onChange,
  className = "",
  "data-testid": testId,
}: TabsProps) {
  const [activeTab, setActiveTab] = useState(
    defaultTab ?? tabs[0]?.id ?? ""
  );
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      onChange?.(tabId);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      let nextIndex = currentIndex;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = tabs.length - 1;
      } else {
        return;
      }

      const nextTab = tabs[nextIndex];
      if (nextTab) {
        handleTabChange(nextTab.id);
        tabRefs.current[nextIndex]?.focus();
      }
    },
    [tabs, activeTab, handleTabChange]
  );

  const activePanel = tabs.find((t) => t.id === activeTab);

  return (
    <div className={`dh-tabs ${className}`} data-testid={testId}>
      <div
        role="tablist"
        aria-label="Tabs"
        className="dh-tabs__list"
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(el) => { tabRefs.current[index] = el; }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`dh-tabs__tab ${activeTab === tab.id ? "dh-tabs__tab--active" : ""}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activePanel && (
        <div
          role="tabpanel"
          id={`tabpanel-${activePanel.id}`}
          aria-labelledby={`tab-${activePanel.id}`}
          className="dh-tabs__panel"
          tabIndex={0}
        >
          {activePanel.content}
        </div>
      )}
    </div>
  );
}
