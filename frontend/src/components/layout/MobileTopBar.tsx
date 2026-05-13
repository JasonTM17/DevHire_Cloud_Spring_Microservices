"use client";

import { Bell, Code2, Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { MobileDrawer } from "@/components/layout/MobileDrawer";
import type { NavLink } from "@/lib/navLinks";
import type { Session } from "@/lib/session";

import "@/styles/components/mobile-top-bar.css";

export interface MobileTopBarProps {
  /** Navigation links to display in the drawer */
  links: NavLink[];
  /** Current user info (optional) */
  user?: { name: string; avatarUrl?: string };
  /** Full session for auth actions */
  session: Session | null;
  /** Unread notification count (0 hides the badge) */
  notificationCount?: number;
}

/**
 * MobileTopBar — Mobile navigation bar (< 768px).
 *
 * Renders a sticky top bar with the DevHire logo, notification bell,
 * and a hamburger button that opens the MobileDrawer.
 * Uses `--dh-*` design tokens for styling.
 *
 * Requirements: 2.2, 2.4, 2.5
 */
export function MobileTopBar({ links, session, notificationCount = 0 }: MobileTopBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="dh-mobile-top-bar" data-testid="mobile-top-bar">
        {/* Logo */}
        <Link href="/" className="dh-mobile-top-bar__logo" aria-label="DevHire Cloud home">
          <Code2 size={24} aria-hidden="true" />
          <span className="dh-mobile-top-bar__logo-text">DevHire</span>
        </Link>

        {/* Right-side actions: notification bell + hamburger */}
        <div className="dh-mobile-top-bar__actions">
          {/* Notification bell (only shown when authenticated) */}
          {session && (
            <Link
              href="/candidate"
              className="dh-mobile-top-bar__bell"
              aria-label={
                notificationCount > 0
                  ? `Notifications (${notificationCount} unread)`
                  : "Notifications"
              }
            >
              <Bell size={20} aria-hidden="true" />
              {notificationCount > 0 && (
                <span className="dh-mobile-top-bar__bell-badge" aria-hidden="true">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </Link>
          )}

          {/* Hamburger toggle */}
          <button
            type="button"
            className="dh-mobile-top-bar__toggle"
            onClick={() => setDrawerOpen(!drawerOpen)}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            aria-controls="mobile-drawer"
          >
            {drawerOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>
      </header>

      {/* Mobile navigation drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        links={links}
        session={session}
      />
    </>
  );
}
