import type { ReactNode } from "react";

type MaxWidth = "sm" | "md" | "lg" | "xl" | "full";

type PageContainerProps = {
  maxWidth?: MaxWidth;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
};

/**
 * PageContainer — Max-width container with responsive padding.
 * Uses --dh-* design tokens for consistent spacing across breakpoints.
 */
export function PageContainer({
  maxWidth = "xl",
  children,
  className = "",
  "data-testid": testId,
}: PageContainerProps) {
  const maxWidthClass = ` dh-page-container--${maxWidth}`;

  return (
    <div
      className={`dh-page-container${maxWidthClass}${className ? ` ${className}` : ""}`}
      data-testid={testId}
    >
      {children}
    </div>
  );
}
