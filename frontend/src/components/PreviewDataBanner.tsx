"use client";

export function PreviewDataBanner() {
  try {
    return (
      <div className="banner warning" role="status">
        Preview data - live API unavailable
      </div>
    );
  } catch {
    return null;
  }
}
