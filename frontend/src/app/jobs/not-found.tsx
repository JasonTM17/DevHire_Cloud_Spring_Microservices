import Link from "next/link";

export default function JobsNotFound() {
  return (
    <div className="dh-not-found">
      <NotFoundIllustration />
      <h2 className="dh-not-found__title">Job not found</h2>
      <p className="dh-not-found__message">
        The job listing you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <Link href="/jobs" className="dh-not-found__link">
        Back to job listings
      </Link>
    </div>
  );
}

function NotFoundIllustration() {
  return (
    <svg
      className="dh-not-found__illustration"
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r="40" fill="var(--dh-color-bg-muted)" stroke="var(--dh-color-border-default)" strokeWidth="2" />
      <text x="60" y="68" textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--dh-color-fg-muted)">
        404
      </text>
    </svg>
  );
}
