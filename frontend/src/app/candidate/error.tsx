"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <div role="alert" className="page-stack">
      <div className="panel">
        <h2>Something went wrong</h2>
        <p>{error.message ?? "An unexpected error occurred in this section."}</p>
        <button className="button primary" type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
