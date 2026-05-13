"use client";

import { Modal } from "@/components/ui/overlays";
import { ProgressBar } from "@/components/ui/primitives/ProgressBar";
import {
  type SubmissionStep,
  stepToProgress,
} from "@/lib/ide/submissionReducer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubmissionProgressModalProps {
  /** Whether the modal is visible */
  open: boolean;
  /** Current submission step */
  step: SubmissionStep;
  /** Error message (e.g. after 3 consecutive poll failures) */
  error?: string;
  /** Callback to close the modal */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

interface StepDef {
  label: string;
  key: SubmissionStep;
}

const STEPS: StepDef[] = [
  { label: "Compiling", key: "compiling" },
  { label: "Running Visible Tests", key: "running-visible" },
  { label: "Running Hidden Tests", key: "running-hidden" },
];

/**
 * Returns the status of a step indicator relative to the current submission step.
 */
function getStepStatus(
  stepKey: SubmissionStep,
  currentStep: SubmissionStep,
): "pending" | "active" | "done" | "failed" {
  const order: SubmissionStep[] = [
    "compiling",
    "running-visible",
    "running-hidden",
    "complete",
  ];

  if (currentStep === "failed") {
    // Mark steps up to the failed point as done, current as failed
    const failedIdx = order.indexOf(stepKey);
    const currentIdx = order.indexOf(currentStep);
    // For failed state, we don't know exactly which step failed,
    // so mark all prior steps as done and the last active as failed
    if (stepKey === "running-hidden") return "failed";
    if (stepKey === "running-visible") return "done";
    if (stepKey === "compiling") return "done";
    return "pending";
  }

  if (currentStep === "complete") return "done";

  const stepIdx = order.indexOf(stepKey);
  const currentIdx = order.indexOf(currentStep);

  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

/**
 * Returns a human-readable status text for the current step.
 */
function getStatusText(step: SubmissionStep, error?: string): string {
  if (error) return error;

  switch (step) {
    case "idle":
      return "Preparing submission…";
    case "compiling":
      return "Compiling your code…";
    case "running-visible":
      return "Running visible test cases…";
    case "running-hidden":
      return "Running hidden test cases…";
    case "complete":
      return "Submission complete!";
    case "failed":
      return "Submission failed.";
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Modal showing 3-step submission progress with a progress bar.
 *
 * Displays:
 * - A 3-step indicator (Compiling → Running Visible Tests → Running Hidden Tests)
 * - A ProgressBar showing overall percentage
 * - Status text describing the current phase
 * - Error state when polling fails 3 consecutive times
 *
 * Requirements: 5.1, 11.3
 */
export function SubmissionProgressModal({
  open,
  step,
  error,
  onClose,
}: SubmissionProgressModalProps) {
  const progress = stepToProgress(step);
  const hasError = Boolean(error);
  const isTerminal = step === "complete" || step === "failed" || hasError;

  const progressVariant = hasError || step === "failed"
    ? "danger"
    : step === "complete"
      ? "success"
      : "default";

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Submission Progress"
      size="sm"
      data-testid="submission-progress-modal"
    >
      <div className="dh-submission-progress">
        {/* Step indicators */}
        <ol
          className="dh-submission-progress__steps"
          aria-label="Submission steps"
        >
          {STEPS.map((s) => {
            const status = getStepStatus(s.key, step);
            return (
              <li
                key={s.key}
                className={`dh-submission-progress__step dh-submission-progress__step--${status}`}
                aria-current={status === "active" ? "step" : undefined}
              >
                <span
                  className="dh-submission-progress__step-indicator"
                  aria-hidden="true"
                >
                  {status === "done" && "✓"}
                  {status === "active" && "●"}
                  {status === "failed" && "✕"}
                  {status === "pending" && "○"}
                </span>
                <span className="dh-submission-progress__step-label">
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>

        {/* Progress bar */}
        <ProgressBar
          value={progress}
          variant={progressVariant}
          size="md"
          showValue
          aria-label="Submission progress"
          className="dh-submission-progress__bar"
        />

        {/* Status text */}
        <p
          className={`dh-submission-progress__status${hasError ? " dh-submission-progress__status--error" : ""}`}
          role={hasError ? "alert" : undefined}
          aria-live="polite"
        >
          {getStatusText(step, error)}
        </p>

        {/* Close button for terminal states */}
        {isTerminal && (
          <button
            type="button"
            className="dh-submission-progress__close-btn"
            onClick={onClose}
          >
            {hasError ? "Dismiss" : "Close"}
          </button>
        )}
      </div>
    </Modal>
  );
}
