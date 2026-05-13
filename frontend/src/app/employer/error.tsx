"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/feedback";

export default function EmployerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[Employer Route Error]", error);
    }
  }, [error]);

  return <ErrorState variant="route" onRetry={reset} />;
}
