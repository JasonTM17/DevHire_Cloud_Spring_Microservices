/**
 * SkipLink — Accessibility skip navigation link.
 * Visually hidden by default, becomes visible on keyboard focus.
 * Should be the first focusable element in the document.
 */

export function SkipLink({
  href = "#main-content",
  children = "Bỏ qua điều hướng",
}: {
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <a href={href} className="dh-skip-link">
      {children}
    </a>
  );
}
