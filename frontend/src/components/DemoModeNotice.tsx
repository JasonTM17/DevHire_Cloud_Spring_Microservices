"use client";

import { MonitorCheck } from "lucide-react";

type DemoModeNoticeProps = {
  message?: string;
};

export function DemoModeNotice({ message }: DemoModeNoticeProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="demo-mode-banner" role="status">
      <MonitorCheck size={18} />
      <div>
        <strong>Review-ready data</strong>
        <span>{message}</span>
      </div>
    </div>
  );
}
