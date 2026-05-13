/**
 * Navigation link definitions and pure utility functions for DevHire Cloud.
 *
 * All functions are pure (no side effects, no DOM access) to enable
 * property-based testing.
 */

export type NavUserRole = "CANDIDATE" | "EMPLOYER" | "ADMIN" | "PUBLIC";

export type NavMode = "mobile" | "condensed" | "desktop";

export type NavLink = {
  label: string;
  href: string;
  icon?: string;
  roles?: NavUserRole[];
  children?: NavLink[];
};

export const navLinks: NavLink[] = [
  { label: "Home", href: "/", icon: "home", roles: ["PUBLIC"] },
  { label: "Challenges", href: "/challenges", icon: "code", roles: ["PUBLIC", "CANDIDATE"] },
  { label: "Jobs", href: "/jobs", icon: "briefcase", roles: ["PUBLIC"] },
  { label: "About", href: "/about", icon: "info", roles: ["PUBLIC"] },

  { label: "Dashboard", href: "/candidate/dashboard", icon: "layout-dashboard", roles: ["CANDIDATE"] },
  { label: "My Applications", href: "/candidate/applications", icon: "file-text", roles: ["CANDIDATE"] },
  { label: "Assessments", href: "/candidate/assessments", icon: "clipboard-check", roles: ["CANDIDATE"] },
  { label: "Profile", href: "/candidate/profile", icon: "user", roles: ["CANDIDATE"] },

  { label: "Dashboard", href: "/employer/dashboard", icon: "layout-dashboard", roles: ["EMPLOYER"] },
  { label: "Pipeline", href: "/employer/pipeline", icon: "kanban", roles: ["EMPLOYER"] },
  { label: "Job Postings", href: "/employer/jobs", icon: "briefcase", roles: ["EMPLOYER"] },
  { label: "Assessments", href: "/employer/assessments", icon: "clipboard-list", roles: ["EMPLOYER"] },
  { label: "Analytics", href: "/employer/analytics", icon: "bar-chart", roles: ["EMPLOYER"] },

  { label: "Overview", href: "/admin", icon: "activity", roles: ["ADMIN"] },
  { label: "Service Health", href: "/admin/health", icon: "heart-pulse", roles: ["ADMIN"] },
  { label: "AI Ops", href: "/admin/ai", icon: "brain", roles: ["ADMIN"] },
  { label: "Observability", href: "/platform/observability", icon: "eye", roles: ["ADMIN"] },
  { label: "Audit Logs", href: "/admin/audit", icon: "scroll-text", roles: ["ADMIN"] },
  { label: "Users", href: "/admin/users", icon: "users", roles: ["ADMIN"] },
];

export function filterNavByRole(links: NavLink[], role: NavUserRole): NavLink[] {
  return links
    .filter((link) => !link.roles || link.roles.includes(role))
    .map((link) => {
      if (!link.children) return link;
      const filteredChildren = filterNavByRole(link.children, role);
      return { ...link, children: filteredChildren };
    });
}

export function selectNavMode(viewportWidth: number): NavMode {
  if (viewportWidth < 768) return "mobile";
  if (viewportWidth < 1024) return "condensed";
  return "desktop";
}
