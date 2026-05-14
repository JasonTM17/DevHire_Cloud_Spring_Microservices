export const STATUS_TOKENS = {
  approved: "APPROVED",
  pending: "PENDING",
  pendingReview: "PENDING_REVIEW",
  published: "PUBLISHED",
  rejected: "REJECTED",
  draft: "DRAFT",
  submitted: "SUBMITTED",
  reviewing: "REVIEWING",
  interview: "INTERVIEW",
  offer: "OFFER",
  withdrawn: "WITHDRAWN",
  assigned: "ASSIGNED",
  scheduled: "SCHEDULED",
  autoReviewed: "AUTO_REVIEWED",
  reviewed: "REVIEWED",
  employerReviewed: "EMPLOYER_REVIEWED",
  passed: "PASSED",
  failed: "FAILED",
  needsReview: "NEEDS_REVIEW",
  unknown: "UNKNOWN"
} as const;

const statusLabelMap: Record<string, string> = {
  [STATUS_TOKENS.approved]: "Approved",
  [STATUS_TOKENS.pending]: "Pending review",
  [STATUS_TOKENS.pendingReview]: "Pending review",
  [STATUS_TOKENS.published]: "Published",
  [STATUS_TOKENS.rejected]: "Rejected",
  [STATUS_TOKENS.draft]: "Draft",
  [STATUS_TOKENS.submitted]: "Submitted",
  [STATUS_TOKENS.reviewing]: "Recruiter review",
  [STATUS_TOKENS.interview]: "Interview",
  [STATUS_TOKENS.offer]: "Offer",
  [STATUS_TOKENS.withdrawn]: "Withdrawn",
  [STATUS_TOKENS.assigned]: "Assigned",
  [STATUS_TOKENS.scheduled]: "Scheduled",
  [STATUS_TOKENS.autoReviewed]: "Rubric reviewed",
  [STATUS_TOKENS.reviewed]: "Reviewed",
  [STATUS_TOKENS.employerReviewed]: "Employer reviewed",
  [STATUS_TOKENS.passed]: "Passed",
  [STATUS_TOKENS.failed]: "Failed",
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
  [STATUS_TOKENS.needsReview]: "Needs review",
  [STATUS_TOKENS.unknown]: "Needs review"
};

export const CODE_REVIEW_STATUS_OPTIONS = [
  { value: STATUS_TOKENS.submitted, label: "Ready for review" },
  { value: STATUS_TOKENS.autoReviewed, label: "Rubric reviewed" },
  { value: STATUS_TOKENS.reviewed, label: "Reviewed" },
  { value: STATUS_TOKENS.employerReviewed, label: "Decision recorded" },
  { value: STATUS_TOKENS.passed, label: "Passed" },
  { value: STATUS_TOKENS.failed, label: "Failed" },
  { value: "ALL", label: "All statuses" }
] as const;

export const FINAL_CODE_ASSESSMENT_STATUSES = new Set<string>([
  STATUS_TOKENS.passed,
  STATUS_TOKENS.failed
]);

export const LOCKED_CODE_ASSESSMENT_STATUSES = new Set<string>([
  STATUS_TOKENS.submitted,
  STATUS_TOKENS.autoReviewed,
  STATUS_TOKENS.reviewed,
  STATUS_TOKENS.employerReviewed,
  STATUS_TOKENS.passed,
  STATUS_TOKENS.failed
]);

export function normalizeStatus(value?: string | null) {
  const normalized = value?.trim();
  if (!normalized || normalized === STATUS_TOKENS.unknown) {
    return STATUS_TOKENS.needsReview;
  }
  return normalized;
}

export function statusLabel(value?: string | null) {
  const normalized = normalizeStatus(value);
  return statusLabelMap[normalized] ?? toTitleCase(normalized);
}

export function isFinalCodeAssessmentStatus(value?: string | null) {
  return FINAL_CODE_ASSESSMENT_STATUSES.has(normalizeStatus(value));
}

export function isLockedCodeAssessmentStatus(value?: string | null) {
  return LOCKED_CODE_ASSESSMENT_STATUSES.has(normalizeStatus(value));
}

export function assessmentTimerStatus(value?: string | null) {
  return isLockedCodeAssessmentStatus(value) ? "LOCKED" : normalizeStatus(value);
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
