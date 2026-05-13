"use client";

import {
  Bell,
  ChevronDown,
  Code2,
  LogOut,
  Search,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { clearSession } from "@/lib/session";
import type { NavLink } from "@/lib/navLinks";
import type { Session } from "@/lib/session";

import "@/styles/components/top-bar.css";

export interface TopBarProps {
  /** Navigation links to display (role-filtered by AppShell) */
  links: NavLink[];
  /** Current user info (optional — shows avatar when provided) */
  user?: { name: string; avatarUrl?: string };
  /** Full session for auth actions */
  session: Session | null;
  /** Unread notification count (from useNotifications hook) */
  notificationCount?: number;
}

/**
 * TopBar — Full desktop navigation bar (≥ 1024px).
 *
 * Renders logo, horizontal nav links, global search slot, notification bell
 * with badge count, and user menu dropdown with proper ARIA roles and
 * keyboard navigation.
 *
 * Requirements: 2.1, 2.4
 */
export function TopBar({ links, user, session, notificationCount = 0 }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [globalSearch, setGlobalSearch] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | HTMLAnchorElement | null)[]>([]);

  // -------------------------------------------------------------------------
  // Close menu on outside click
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!userMenuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  // -------------------------------------------------------------------------
  // Close menu on Escape, manage focus
  // -------------------------------------------------------------------------

  const handleMenuKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const items = menuItemsRef.current.filter(Boolean) as HTMLElement[];
      const currentIndex = items.findIndex(
        (item) => item === document.activeElement
      );

      switch (event.key) {
        case "Escape":
          event.preventDefault();
          setUserMenuOpen(false);
          triggerRef.current?.focus();
          break;
        case "ArrowDown":
          event.preventDefault();
          if (currentIndex < items.length - 1) {
            items[currentIndex + 1]?.focus();
          } else {
            items[0]?.focus();
          }
          break;
        case "ArrowUp":
          event.preventDefault();
          if (currentIndex > 0) {
            items[currentIndex - 1]?.focus();
          } else {
            items[items.length - 1]?.focus();
          }
          break;
        case "Tab":
          // Close menu when tabbing out
          setUserMenuOpen(false);
          break;
        case "Home":
          event.preventDefault();
          items[0]?.focus();
          break;
        case "End":
          event.preventDefault();
          items[items.length - 1]?.focus();
          break;
      }
    },
    []
  );

  // -------------------------------------------------------------------------
  // Focus first menu item when menu opens
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (userMenuOpen) {
      // Small delay to allow DOM to render
      requestAnimationFrame(() => {
        const items = menuItemsRef.current.filter(Boolean) as HTMLElement[];
        items[0]?.focus();
      });
    }
  }, [userMenuOpen]);

  // -------------------------------------------------------------------------
  // Trigger keyboard handling
  // -------------------------------------------------------------------------

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setUserMenuOpen(true);
    }
  }

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = globalSearch.trim();
    router.push(keyword ? `/jobs?search=${encodeURIComponent(keyword)}` : "/jobs");
  }

  function handleLogout() {
    setUserMenuOpen(false);
    clearSession();
    router.push("/login");
  }

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  // -------------------------------------------------------------------------
  // Notification badge display
  // -------------------------------------------------------------------------

  const displayCount = notificationCount > 99 ? "99+" : String(notificationCount);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="dh-topbar" data-testid="top-bar">
      <div className="dh-topbar__inner">
        {/* Logo */}
        <Link href="/" className="dh-topbar__logo" aria-label="DevHire Cloud home">
          <Code2 size={28} strokeWidth={2.5} aria-hidden="true" />
          <span className="dh-topbar__logo-text">
            <strong>DevHire</strong>
            <small>Cloud</small>
          </span>
        </Link>

        {/* Main navigation */}
        <nav className="dh-topbar__nav" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`dh-topbar__nav-link ${isActive(link.href) ? "dh-topbar__nav-link--active" : ""}`}
              aria-current={isActive(link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Global search slot */}
        <form
          className="dh-topbar__search-slot"
          onSubmit={submitSearch}
          role="search"
          aria-label="Global search"
        >
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search jobs..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            aria-label="Search jobs"
          />
        </form>

        {/* Actions area */}
        <div className="dh-topbar__actions">
          {session ? (
            <>
              {/* Notification bell with badge */}
              <Link
                href="/candidate/notifications"
                className="dh-topbar__bell"
                aria-label={
                  notificationCount > 0
                    ? `Notifications, ${notificationCount} unread`
                    : "Notifications"
                }
              >
                <Bell size={20} aria-hidden="true" />
                {notificationCount > 0 && (
                  <span className="dh-topbar__bell-badge" aria-hidden="true">
                    {displayCount}
                  </span>
                )}
              </Link>

              {/* User menu */}
              <div className="dh-topbar__user-menu" ref={menuRef}>
                <button
                  ref={triggerRef}
                  className="dh-topbar__user-trigger"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  onKeyDown={handleTriggerKeyDown}
                  type="button"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  aria-label={`User menu for ${user?.name ?? session.user.email}`}
                >
                  <span className="dh-topbar__avatar" aria-hidden="true">
                    {(user?.name ?? session.user.email).charAt(0).toUpperCase()}
                  </span>
                  {user?.name && (
                    <span className="dh-topbar__user-name">{user.name}</span>
                  )}
                  <ChevronDown size={14} aria-hidden="true" />
                </button>

                {userMenuOpen && (
                  <div
                    className="dh-topbar__dropdown"
                    role="menu"
                    aria-label="User actions"
                    onKeyDown={handleMenuKeyDown}
                  >
                    <div className="dh-topbar__dropdown-info" role="none">
                      <strong>{session.user.role}</strong>
                      <small>{session.user.email}</small>
                    </div>
                    <div className="dh-topbar__dropdown-divider" role="none" />
                    <a
                      href="/candidate/profile"
                      className="dh-topbar__dropdown-item"
                      role="menuitem"
                      tabIndex={-1}
                      ref={(el) => { menuItemsRef.current[0] = el; }}
                    >
                      <User size={14} aria-hidden="true" />
                      Profile
                    </a>
                    <a
                      href="/settings"
                      className="dh-topbar__dropdown-item"
                      role="menuitem"
                      tabIndex={-1}
                      ref={(el) => { menuItemsRef.current[1] = el; }}
                    >
                      <Settings size={14} aria-hidden="true" />
                      Settings
                    </a>
                    <div className="dh-topbar__dropdown-divider" role="none" />
                    <button
                      className="dh-topbar__dropdown-item dh-topbar__dropdown-item--danger"
                      onClick={handleLogout}
                      type="button"
                      role="menuitem"
                      tabIndex={-1}
                      ref={(el) => { menuItemsRef.current[2] = el; }}
                    >
                      <LogOut size={14} aria-hidden="true" />
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
