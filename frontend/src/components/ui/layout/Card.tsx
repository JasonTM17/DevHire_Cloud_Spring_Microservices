import type { ReactNode } from "react";

type CardVariant = "default" | "elevated" | "outlined";
type CardPadding = "none" | "sm" | "md" | "lg";

type CardProps = {
  variant?: CardVariant;
  padding?: CardPadding;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
  onClick?: () => void;
};

/**
 * Card — Surface wrapper with background, border, radius, and shadow.
 * Uses --dh-* design tokens for consistent styling across themes.
 */
export function Card({
  variant = "default",
  padding = "md",
  children,
  className = "",
  "data-testid": testId,
  onClick,
}: CardProps) {
  const variantClass = variant !== "default" ? ` dh-card--${variant}` : "";
  const paddingClass = ` dh-card--padding-${padding}`;

  return (
    <div
      className={`dh-card${variantClass}${paddingClass}${className ? ` ${className}` : ""}`}
      data-testid={testId}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
