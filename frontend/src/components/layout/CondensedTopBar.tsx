"use client";

import {
  Activity,
  BarChart,
  Brain,
  Briefcase,
  Circle,
  ClipboardCheck,
  ClipboardList,
  Code2,
  Eye,
  FileText,
  HeartPulse,
  Home,
  Info,
  Kanban,
  LayoutDashboard,
  MoreHorizontal,
  ScrollText,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { Avatar } from "@/components/ui/primitives/Avatar";
import { Tooltip } from "@/components/ui/primitives/Tooltip";
import { Dropdown, type DropdownItem } from "@/components/ui/overlays/Dropdown";
import { filterNavByRole, navLinks } from "@/lib/navLinks";
import type { NavLink, NavUserRole } from "@/lib/navLinks";
import type { Session } from "@/lib/session";

import "@/styles/components/condensed-top-bar.css";

/* --------------------------------------------------------------------------
   NavIcon — maps icon name strings to Lucide icons.
   Falls back to a generic circle if the icon name is unknown.
   -------------------------------------------------------------------------- */

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  home: Home,
  code: Code2,
  briefcase: Briefcase,
  info: Info,
  "layout-dashboard": LayoutDashboard,
  "file-text": FileText,
  "clipboard-check": ClipboardCheck,
  "clipboard-list": ClipboardList,
  user: User,
  kanban: Kanban,
  "bar-chart": BarChart,
  activity: Activity,
  "heart-pulse": HeartPulse,
  brain: Brain,
  eye: Eye,
  "scroll-text": ScrollText,
  users: Users,
};

function NavIcon({ name, size = 20 }: { name?: string; size?: number }) {
  const IconComponent = name ? iconMap[name] : undefined;
  if (!IconComponent) {
    return <Circle size={size} aria-hidden="true" />;
  }
  return <IconComponent size={size} />;
}

/* --------------------------------------------------------------------------
   CondensedTopBar
   -------------------------------------------------------------------------- */

/** Maximum number of icon links shown directly in the bar */
const MAX_VISIBLE_ICONS = 5;

export interface CondensedTopBarProps {
  /** Navigation links to display (derived from session if not provided) */
  links?: NavLink[];
  /** Current user info (derived from session if not provided) */
  user?: { name: string; avatarUrl?: string };
  /** Session object — used to derive links and user when explicit props are omitted */
  session?: Session | null;
}

/**
 * Tablet navigation bar (768–1023px viewport).
 *
 * - Logo on the left
 * - First N links rendered as icon-only buttons with tooltips
 * - Remaining links collapsed into a "More" dropdown
 * - User avatar button on the right
 *
 * Accepts either explicit `links`/`user` props or a `session` prop from which
 * links and user info are derived. Styled with `--dh-*` design tokens.
 *
 * Uses `Dropdown` from `@/components/ui/overlays` and `Tooltip` from
 * `@/components/ui/primitives`.
 */
export function CondensedTopBar({ links, user, session }: CondensedTopBarProps) {
  const pathname = usePathname();

  // Derive links from session if not explicitly provided
  const resolvedLinks: NavLink[] = useMemo(() => {
    if (links) return links;
    const role: NavUserRole = session?.user.role ?? "PUBLIC";
    return filterNavByRole(navLinks, role);
  }, [links, session]);

  // Derive user from session if not explicitly provided
  const resolvedUser = useMemo(() => {
    if (user) return user;
    if (session?.user) {
      return { name: session.user.email, avatarUrl: undefined };
    }
    return undefined;
  }, [user, session]);

  const visibleLinks = resolvedLinks.slice(0, MAX_VISIBLE_ICONS);
  const overflowLinks = resolvedLinks.slice(MAX_VISIBLE_ICONS);

  const overflowItems: DropdownItem[] = useMemo(
    () =>
      overflowLinks.map((link) => ({
        label: link.label,
        onClick: () => {
          window.location.href = link.href;
        },
        icon: <NavIcon name={link.icon} size={16} />,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [overflowLinks.map((l) => l.href).join(",")]
  );

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="dh-condensed-top-bar" data-testid="condensed-top-bar">
      {/* Logo */}
      <Link href="/" className="dh-condensed-top-bar__logo" aria-label="DevHire Cloud home">
        <Code2 size={24} className="dh-condensed-top-bar__logo-icon" aria-hidden="true" />
      </Link>

      {/* Icon-only nav links */}
      <nav className="dh-condensed-top-bar__nav" aria-label="Main navigation">
        {visibleLinks.map((link) => {
          const active = isActive(link.href);
          const linkClasses = [
            "dh-condensed-top-bar__nav-link",
            active && "dh-condensed-top-bar__nav-link--active",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <Tooltip key={link.href} content={link.label} position="bottom">
              <Link
                href={link.href}
                className={linkClasses}
                aria-label={link.label}
                aria-current={active ? "page" : undefined}
              >
                <NavIcon name={link.icon} size={20} />
              </Link>
            </Tooltip>
          );
        })}

        {/* More dropdown for overflow links */}
        {overflowLinks.length > 0 && (
          <Dropdown
            trigger={
              <span className="dh-condensed-top-bar__more-btn" aria-label="More navigation links">
                <MoreHorizontal size={20} aria-hidden="true" />
              </span>
            }
            items={overflowItems}
            align="left"
            data-testid="condensed-top-bar-more"
          />
        )}
      </nav>

      {/* Spacer */}
      <div className="dh-condensed-top-bar__spacer" />

      {/* User avatar */}
      {resolvedUser && (
        <button
          type="button"
          className="dh-condensed-top-bar__user-btn"
          aria-label={`User menu for ${resolvedUser.name}`}
        >
          <Avatar
            src={resolvedUser.avatarUrl}
            alt={resolvedUser.name}
            size="sm"
          />
        </button>
      )}
    </header>
  );
}
