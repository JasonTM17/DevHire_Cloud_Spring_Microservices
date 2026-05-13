"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

export interface SplitPaneProps {
  orientation: "horizontal" | "vertical";
  initialRatio?: number;
  minRatio?: number;
  maxRatio?: number;
  onChangeRatio?: (ratio: number) => void;
  storageKey?: string;
  children: [ReactNode, ReactNode];
  className?: string;
  "data-testid"?: string;
}

const KEYBOARD_STEP = 0.05;
const DEBOUNCE_MS = 300;
const CLAMP_MIN = 0.1;
const CLAMP_MAX = 0.9;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function readStoredRatio(
  storageKey: string | undefined,
  min: number,
  max: number,
  fallback: number
): number {
  if (!storageKey || typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return fallback;
    const parsed = parseFloat(raw);
    if (Number.isNaN(parsed)) return fallback;
    return clamp(parsed, Math.max(min, CLAMP_MIN), Math.min(max, CLAMP_MAX));
  } catch {
    return fallback;
  }
}

export function SplitPane({
  orientation,
  initialRatio = 0.5,
  minRatio = 0.1,
  maxRatio = 0.9,
  onChangeRatio,
  storageKey,
  children,
  className = "",
  ...props
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveMin = Math.max(minRatio, CLAMP_MIN);
  const effectiveMax = Math.min(maxRatio, CLAMP_MAX);

  const [ratio, setRatio] = useState<number>(() =>
    readStoredRatio(storageKey, effectiveMin, effectiveMax, initialRatio)
  );

  // Restore from localStorage on mount (SSR-safe)
  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    const stored = readStoredRatio(
      storageKey,
      effectiveMin,
      effectiveMax,
      initialRatio
    );
    setRatio(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Debounced write to localStorage
  const persistRatio = useCallback(
    (newRatio: number) => {
      if (!storageKey || typeof window === "undefined") return;
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, String(newRatio));
        } catch {
          // localStorage may be full or unavailable
        }
      }, DEBOUNCE_MS);
    },
    [storageKey]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const updateRatio = useCallback(
    (newRatio: number) => {
      const clamped = clamp(newRatio, effectiveMin, effectiveMax);
      setRatio(clamped);
      onChangeRatio?.(clamped);
      persistRatio(clamped);
    },
    [effectiveMin, effectiveMax, onChangeRatio, persistRatio]
  );

  // Mouse drag handling
  const handleMouseDown = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
        let newRatio: number;
        if (orientation === "horizontal") {
          newRatio = (moveEvent.clientX - rect.left) / rect.width;
        } else {
          newRatio = (moveEvent.clientY - rect.top) / rect.height;
        }
        updateRatio(newRatio);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor =
        orientation === "horizontal" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [orientation, updateRatio]
  );

  // Keyboard handling
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      let delta = 0;

      if (orientation === "horizontal") {
        if (e.key === "ArrowLeft") delta = -KEYBOARD_STEP;
        else if (e.key === "ArrowRight") delta = KEYBOARD_STEP;
      } else {
        if (e.key === "ArrowUp") delta = -KEYBOARD_STEP;
        else if (e.key === "ArrowDown") delta = KEYBOARD_STEP;
      }

      if (e.key === "Home") {
        e.preventDefault();
        updateRatio(effectiveMin);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        updateRatio(effectiveMax);
        return;
      }

      if (delta !== 0) {
        e.preventDefault();
        updateRatio(ratio + delta);
      }
    },
    [orientation, ratio, updateRatio, effectiveMin, effectiveMax]
  );

  // Compute aria values (0-100 scale)
  const ariaValueNow = Math.round(ratio * 100);
  const ariaValueMin = Math.round(effectiveMin * 100);
  const ariaValueMax = Math.round(effectiveMax * 100);

  const isHorizontal = orientation === "horizontal";

  const firstPaneStyle = isHorizontal
    ? { width: `${ratio * 100}%` }
    : { height: `${ratio * 100}%` };

  const secondPaneStyle = isHorizontal
    ? { width: `${(1 - ratio) * 100}%` }
    : { height: `${(1 - ratio) * 100}%` };

  const classes = [
    "dh-split-pane",
    `dh-split-pane--${orientation}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={containerRef}
      className={classes}
      data-testid={props["data-testid"]}
    >
      <div className="dh-split-pane__panel" style={firstPaneStyle}>
        {children[0]}
      </div>
      <div
        className="dh-split-pane__handle"
        role="separator"
        aria-valuenow={ariaValueNow}
        aria-valuemin={ariaValueMin}
        aria-valuemax={ariaValueMax}
        aria-orientation={orientation}
        aria-label={
          isHorizontal
            ? "Resize panels horizontally"
            : "Resize panels vertically"
        }
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
      >
        <div className="dh-split-pane__handle-indicator" />
      </div>
      <div className="dh-split-pane__panel" style={secondPaneStyle}>
        {children[1]}
      </div>
    </div>
  );
}
