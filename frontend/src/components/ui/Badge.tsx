type BadgeProps = {
  variant?: "easy" | "medium" | "hard" | "default" | "success" | "error" | "info";
  children: React.ReactNode;
};

export function Badge({ variant = "default", children }: BadgeProps) {
  return <span className={`badge badge--${variant}`}>{children}</span>;
}
