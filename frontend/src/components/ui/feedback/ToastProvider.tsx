"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Toast, type ToastVariant } from "./Toast";

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

export interface ToastContextValue {
  /** Show a toast notification */
  toast: (opts: Omit<ToastItem, "id">) => string;
  /** Dismiss a toast by id */
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

function generateId(): string {
  toastCounter += 1;
  return `toast-${toastCounter}-${Date.now()}`;
}

/**
 * ToastProvider — Context provider managing toast queue.
 * Renders 2 live regions:
 * - aria-live="polite" for info/success toasts
 * - aria-live="assertive" for warning/error (critical) toasts
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((opts: Omit<ToastItem, "id">): string => {
    const id = generateId();
    setToasts((prev) => [...prev, { ...opts, id }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ toast, dismiss }), [toast, dismiss]);

  // Split toasts into polite (info/success) and assertive (warning/error)
  const politeToasts = toasts.filter(
    (t) => t.variant === "info" || t.variant === "success"
  );
  const assertiveToasts = toasts.filter(
    (t) => t.variant === "warning" || t.variant === "error"
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Polite live region — info/success */}
      <div
        className="dh-toast-region dh-toast-region--polite"
        aria-live="polite"
        aria-atomic="true"
        aria-relevant="additions removals"
        role="status"
      >
        {politeToasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            variant={toast.variant}
            title={toast.title}
            description={toast.description}
            duration={toast.duration}
            onDismiss={dismiss}
          />
        ))}
      </div>

      {/* Assertive live region — warning/error (critical) */}
      <div
        className="dh-toast-region dh-toast-region--assertive"
        aria-live="assertive"
        aria-atomic="true"
        aria-relevant="additions removals"
        role="alert"
      >
        {assertiveToasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            variant={toast.variant}
            title={toast.title}
            description={toast.description}
            duration={toast.duration}
            onDismiss={dismiss}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * useToast — Hook to access toast show/dismiss methods.
 * Must be used within a <ToastProvider>.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}
