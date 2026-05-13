import Link from "next/link";

export default function CandidateNotFound() {
  return (
    <div className="dh-not-found">
      <NotFoundIllustration />
      <h2 className="dh-not-found__title">Page not found</h2>
      <p className="dh-not-found__message">
        The candidate page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/candidate" className="dh-not-found__link">
        Back to candidate dashboard
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
