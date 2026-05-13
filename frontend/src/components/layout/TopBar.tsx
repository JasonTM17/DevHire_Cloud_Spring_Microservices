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
    <div className="itviec-header" data-testid="top-bar">
      <div className="itviec-header__inner">
        <Link href="/" className="itviec-header__logo">
          <Code2 size={28} strokeWidth={2.5} />
          <span className="itviec-header__logo-text">
            <strong>DevHire</strong>
            <small>Cloud</small>
          </span>
        </Link>

        <nav className="itviec-header__nav" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`itviec-header__nav-link ${isActive(link.href) ? "active" : ""}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <form className="itviec-header__search" onSubmit={submitSearch} aria-label="Job search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search jobs..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
          />
        </form>

        <div className="itviec-header__actions">
          {session ? (
            <>
              <Link href="/candidate" className="itviec-header__icon-btn" aria-label="Notifications">
                <Bell size={20} />
              </Link>
              <div className="itviec-header__user-menu">
                <button
                  className="itviec-header__user-btn"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  type="button"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  <span className="itviec-header__avatar">
                    {session.user.email.charAt(0).toUpperCase()}
                  </span>
                  <ChevronDown size={14} />
                </button>
                {userMenuOpen && (
                  <div className="itviec-header__dropdown" role="menu">
                    <div className="itviec-header__dropdown-info">
                      <strong>{session.user.role}</strong>
                      <small>{session.user.email}</small>
                    </div>
                    <div className="itviec-header__dropdown-divider" />
                    <button
                      className="itviec-header__dropdown-item itviec-header__dropdown-item--danger"
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
            <>
              <Link href="/login" className="itviec-header__login-btn">
                Sign in
              </Link>
              <Link href="/register" className="itviec-header__register-btn">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
