"use client";

import { usePathname } from "next/navigation";
import { useCallback, useRef, type KeyboardEvent } from "react";
import "@/styles/components/ops-sidebar.css";

export interface OpsNavItem {
  label: string;
  href: string;
  icon: string;
}

export interface OpsSidebarProps {
  items?: OpsNavItem[];
}

const DEFAULT_NAV_ITEMS: OpsNavItem[] = [
  { label: "Overview", href: "/admin", icon: "OV" },
  { label: "Service Health", href: "/admin/monitoring", icon: "HL" },
  { label: "AI Ops", href: "/admin/ai", icon: "AI" },
  { label: "Observability", href: "/platform/observability", icon: "OB" },
  { label: "Audit Logs", href: "/admin/audit", icon: "AU" },
  { label: "Alerts", href: "/admin/alerts", icon: "AL" },
];

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

export function OpsSidebar({ items = DEFAULT_NAV_ITEMS }: OpsSidebarProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  const isActive = (href: string): boolean => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLElement>) => {
    const nav = navRef.current;
    if (!nav) return;

    const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>(".ops-nav-link"));
    const currentIndex = links.findIndex((link) => link === document.activeElement);
    let nextIndex = -1;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        nextIndex = currentIndex < links.length - 1 ? currentIndex + 1 : 0;
        break;
      case "ArrowUp":
        event.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : links.length - 1;
        break;
      case "Home":
        event.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        event.preventDefault();
        nextIndex = links.length - 1;
        break;
      default:
        return;
    }

    links[nextIndex]?.focus();
  }, []);

  return (
    <nav
      ref={navRef}
      className="ops-sidebar"
      aria-label="OPS Dashboard navigation"
      onKeyDown={handleKeyDown}
      data-testid="ops-sidebar"
    >
      <div className="ops-sidebar__brand">
        <span className="ops-sidebar__logo" aria-hidden="true">DH</span>
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
