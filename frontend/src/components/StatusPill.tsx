const statusLabelMap: Record<string, string> = {
  APPROVED: "Approved",
  PENDING: "Pending review",
  PENDING_REVIEW: "Pending review",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  REVIEWING: "Recruiter review",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  WITHDRAWN: "Withdrawn",
  ASSIGNED: "Assigned",
  SCHEDULED: "Scheduled",
  AUTO_REVIEWED: "Rubric reviewed",
  EMPLOYER_REVIEWED: "Employer reviewed",
  PASSED: "Passed",
  FAILED: "Failed",
  REVIEW_QUEUE: "Review queue",
  PROVIDER_READY: "Provider ready",
  SAFE_PREVIEW: "Safe review mode",
  REVIEWER_SAFE: "Safe review mode",
  CIRCUIT_OPEN_SAFE_MODE: "Safe circuit mode",
  CLOSED: "Closed",
  OPEN: "Open",
  ADMIN: "Admin",
  EMPLOYER: "Employer",
  CANDIDATE: "Candidate",
  CLAUDE: "Claude",
  SAFETY_BACKUP: "Safety backup",
  UNKNOWN: "Needs review"
};

export function StatusPill({ value }: { value: string }) {
  const normalized = value?.trim() || "UNKNOWN";
  const className = normalized.toLowerCase().replaceAll("_", "-");
  return <span className={`status status-${className}`}>{statusLabel(normalized)}</span>;
}

export function statusLabel(value: string) {
  const normalized = value?.trim() || "UNKNOWN";
  return statusLabelMap[normalized] ?? toTitleCase(normalized);
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
