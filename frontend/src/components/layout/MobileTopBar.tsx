"use client";

import { Code2, Menu, X } from "lucide-react";
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
}

/**
 * MobileTopBar — Mobile navigation bar (< 768px).
 *
 * Renders a sticky top bar with the DevHire logo and a hamburger button
 * that opens the MobileDrawer. Uses `--dh-*` design tokens for styling.
 *
 * Requirements: 2.2, 2.4, 2.5
 */
export function MobileTopBar({ links, session }: MobileTopBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="dh-mobile-top-bar" data-testid="mobile-top-bar">
        {/* Logo */}
        <Link href="/" className="dh-mobile-top-bar__logo" aria-label="DevHire Cloud home">
          <Code2 size={24} aria-hidden="true" />
          <span className="dh-mobile-top-bar__logo-text">DevHire</span>
        </Link>

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
