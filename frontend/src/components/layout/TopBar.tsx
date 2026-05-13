"use client";

import {
  Bell,
  ChevronDown,
  Code2,
  LogOut,
  Search,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { clearSession } from "@/lib/session";
import type { NavLink } from "@/lib/navLinks";
import type { Session } from "@/lib/session";

import "@/styles/components/top-bar.css";

export interface TopBarProps {
  /** Navigation links to display */
  links: NavLink[];
  /** Current user info (optional — shows avatar when provided) */
  user?: { name: string; avatarUrl?: string };
  /** Full session for auth actions */
  session: Session | null;
}

/**
 * TopBar — Full desktop navigation bar (≥ 1024px).
 * Renders logo, main nav links, global search, notification bell, and user menu.
 * Placeholder implementation — will be fully styled in task 5.2.
 */
export function TopBar({ links, user, session }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [globalSearch, setGlobalSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = globalSearch.trim();
    router.push(keyword ? `/jobs?search=${encodeURIComponent(keyword)}` : "/jobs");
  }

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="dh-topbar" data-testid="top-bar">
      <div className="dh-topbar__inner">
        <Link href="/" className="dh-topbar__logo">
          <Code2 size={28} strokeWidth={2.5} />
          <span className="dh-topbar__logo-text">
            <strong>DevHire</strong>
            <small>Cloud</small>
          </span>
        </Link>

        <nav className="dh-topbar__nav" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`dh-topbar__nav-link ${isActive(link.href) ? "dh-topbar__nav-link--active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <form className="dh-topbar__search-slot" onSubmit={submitSearch} aria-label="Job search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search jobs..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
          />
        </form>

        <div className="dh-topbar__actions">
          {session ? (
            <>
              <Link href="/candidate" className="dh-topbar__bell" aria-label="Notifications">
                <Bell size={20} />
              </Link>
              <div className="dh-topbar__user-menu">
                <button
                  className="dh-topbar__user-trigger"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  type="button"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  <span className="dh-topbar__avatar">
                    {session.user.email.charAt(0).toUpperCase()}
                  </span>
                  <ChevronDown size={14} />
                </button>
                {userMenuOpen && (
                  <div className="dh-topbar__dropdown" role="menu">
                    <div className="dh-topbar__dropdown-info">
                      <strong>{session.user.role}</strong>
                      <small>{session.user.email}</small>
                    </div>
                    <div className="dh-topbar__dropdown-divider" />
                    <button
                      className="dh-topbar__dropdown-item dh-topbar__dropdown-item--danger"
                      onClick={handleLogout}
                      type="button"
                      role="menuitem"
                    >
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="dh-topbar__auth-links">
              <Link href="/login" className="dh-topbar__auth-link">
                Sign in
              </Link>
              <Link href="/register" className="dh-topbar__auth-link dh-topbar__auth-link--primary">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
