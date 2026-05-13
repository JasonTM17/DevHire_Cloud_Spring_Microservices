"use client";

import { ErrorBoundary } from "./ErrorBoundary";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

export function ErrorBoundaryClient({ children, fallback }: Props) {
  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>;
}
