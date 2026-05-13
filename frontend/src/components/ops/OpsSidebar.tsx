"use client";

import { usePathname } from "next/navigation";
import { useCallback, useRef, type KeyboardEvent } from "react";
import "@/styles/components/ops-sidebar.css";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OpsNavItem {
  label: string;
  href: string;
  icon: string;
}

export interface OpsSidebarProps {
  /** Override default nav items (useful for testing) */
  items?: OpsNavItem[];
}

// ─── Default nav items ───────────────────────────────────────────────────────

const DEFAULT_NAV_ITEMS: OpsNavItem[] = [
  { label: "Overview", href: "/admin", icon: "⊞" },
  { label: "Service Health", href: "/admin/monitoring", icon: "♥" },
  { label: "AI Ops", href: "/admin/ai", icon: "⚡" },
  { label: "Observability", href: "/platform/observability", icon: "◎" },
  { label: "Audit Logs", href: "/admin/audit", icon: "📋" },
  { label: "Alerts", href: "/admin/alerts", icon: "🔔" },
];

// ─── OpsNavLink ──────────────────────────────────────────────────────────────

interface OpsNavLinkProps {
  item: OpsNavItem;
  isActive: boolean;
}

function OpsNavLink({ item, isActive }: OpsNavLinkProps) {
  return (
    <a
      href={item.href}
      className={`ops-nav-link${isActive ? " ops-nav-link--active" : ""}`}
      aria-current={isActive ? "page" : undefined}
      data-testid={`ops-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <span className="ops-nav-link__icon" aria-hidden="true">
        {item.icon}
      </span>
      <span className="ops-nav-link__label">{item.label}</span>
    </a>
  );
}

// ─── OpsSidebar ──────────────────────────────────────────────────────────────

/**
 * OpsSidebar — Navigation sidebar for OPS Dashboard.
 *
 * Links: Overview, Service Health, AI Ops, Observability, Audit Logs, Alerts.
 * Active state highlight based on current pathname.
 * Keyboard navigation: ArrowDown/ArrowUp to move between links.
 *
 * Requirements: 6.5
 */
export function OpsSidebar({ items = DEFAULT_NAV_ITEMS }: OpsSidebarProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  const isActive = (href: string): boolean => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const nav = navRef.current;
      if (!nav) return;

      const links = Array.from(
        nav.querySelectorAll<HTMLAnchorElement>(".ops-nav-link")
      );
      const currentIndex = links.findIndex(
        (link) => link === document.activeElement
      );

      let nextIndex = -1;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          nextIndex =
            currentIndex < links.length - 1 ? currentIndex + 1 : 0;
          break;
        case "ArrowUp":
          e.preventDefault();
          nextIndex =
            currentIndex > 0 ? currentIndex - 1 : links.length - 1;
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = links.length - 1;
          break;
        default:
          return;
      }

      if (nextIndex >= 0 && links[nextIndex]) {
        links[nextIndex].focus();
      }
    },
    []
  );

  return (
    <nav
      ref={navRef}
      className="ops-sidebar"
      aria-label="OPS Dashboard navigation"
      onKeyDown={handleKeyDown}
      data-testid="ops-sidebar"
    >
      <div className="ops-sidebar__brand">
        <span className="ops-sidebar__logo" aria-hidden="true">◈</span>
        <span className="ops-sidebar__title">DevHire OPS</span>
      </div>
      <ul className="ops-sidebar__nav-list" role="list">
        {items.map((item) => (
          <li key={item.href} className="ops-sidebar__nav-item">
            <OpsNavLink item={item} isActive={isActive(item.href)} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
