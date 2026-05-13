"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readIdeState,
  saveIdeState,
  type IDEPersistedState,
} from "@/lib/ide/persistence";

/* --------------------------------------------------------------------------
   Types
   -------------------------------------------------------------------------- */

export type EditorTabId = "solution" | "visible-tests" | "notes";

export interface IdeState {
  activeTab: EditorTabId;
  language: string;
  fontSize?: number;
  horizontalRatio?: number;
  verticalRatio?: number;
}

const DEFAULT_IDE_STATE: IdeState = {
  activeTab: "solution",
  language: "java",
};

const VALID_TABS: EditorTabId[] = ["solution", "visible-tests", "notes"];

function isValidTab(tab: string): tab is EditorTabId {
  return VALID_TABS.includes(tab as EditorTabId);
}

/* --------------------------------------------------------------------------
   Hook: useIdeState
   -------------------------------------------------------------------------- */

/**
 * Manages IDE state (active tab, language, etc.) with localStorage persistence.
 * SSR-safe: returns defaults on the server, hydrates from localStorage on mount.
 */
export function useIdeState() {
  const [state, setState] = useState<IdeState>(DEFAULT_IDE_STATE);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const persisted = readIdeState();
    if (persisted) {
      setState({
        activeTab: isValidTab(persisted.activeTab)
          ? persisted.activeTab
          : DEFAULT_IDE_STATE.activeTab,
        language: persisted.language || DEFAULT_IDE_STATE.language,
        fontSize: persisted.fontSize,
        horizontalRatio: persisted.horizontalRatio,
        verticalRatio: persisted.verticalRatio,
      });
    }
  }, []);

  // Persist state changes to localStorage
  const persist = useCallback((newState: IdeState) => {
    const toPersist: IDEPersistedState = {
      activeTab: newState.activeTab,
      language: newState.language,
      fontSize: newState.fontSize,
      horizontalRatio: newState.horizontalRatio,
      verticalRatio: newState.verticalRatio,
    };
    saveIdeState(toPersist);
  }, []);

  const setActiveTab = useCallback(
    (tab: EditorTabId) => {
      setState((prev) => {
        const next = { ...prev, activeTab: tab };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const setLanguage = useCallback(
    (language: string) => {
      setState((prev) => {
        const next = { ...prev, language };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  return {
    ...state,
    setActiveTab,
    setLanguage,
  };
}
