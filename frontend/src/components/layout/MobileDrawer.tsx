"use client";

import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";

import { Drawer } from "@/components/ui/overlays";
import type { NavLink } from "@/lib/navLinks";
import type { Session } from "@/lib/session";

import "@/styles/components/mobile-drawer.css";

export interface MobileDrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Callback to close the drawer */
  onClose: () => void;
  /** Navigation links to display */
  links: NavLink[];
  /** Current user session (null if not authenticated) */
  session: Session | null;
}

/**
 * MobileDrawer — Slide-in navigation drawer for mobile viewports (< 768px).
 *
 * Uses the `Drawer` primitive from `@/components/ui/overlays` which provides:
 * - Focus trap via `useFocusTrap` internally
 * - Close on Escape key
 * - Close on backdrop (outside) click
 *
 * Additionally closes on route change via `usePathname` effect.
 * Groups nav links by section based on href prefix.
 */
export function MobileDrawer({ open, onClose, links, session }: MobileDrawerProps) {
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    if (open) {
      onClose();
    }
    // Only trigger on pathname change, not on open/onClose reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Group links by section based on href prefix
  const sections = useMemo(() => groupLinksBySection(links), [links]);

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <Drawer
      isOpen={open}
      onClose={onClose}
      title="Navigation"
      position="left"
      data-testid="mobile-drawer"
    >
      {/* User info when logged in */}
      {session && (
        <>
          <div className="dh-mobile-drawer__user-info">
            <span className="dh-mobile-drawer__user-avatar">
              {session.user.email.charAt(0).toUpperCase()}
            </span>
            <div className="dh-mobile-drawer__user-details">
              <span className="dh-mobile-drawer__user-role">
                {session.user.role.toLowerCase()}
              </span>
              <span className="dh-mobile-drawer__user-email">
                {session.user.email}
              </span>
            </div>
          </div>
          <hr className="dh-mobile-drawer__divider" />
        </>
      )}

      {/* Grouped navigation links */}
      <nav aria-label="Mobile navigation">
        {sections.map((section) => (
          <div key={section.title} className="dh-mobile-drawer__section">
            {section.title && (
              <span className="dh-mobile-drawer__section-title">
                {section.title}
              </span>
            )}
            {section.links.map((link) => {
              const active = isActive(link.href);
              const linkClasses = [
                "dh-mobile-drawer__link",
                active && "dh-mobile-drawer__link--active",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={linkClasses}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Auth section */}
      <div className="dh-mobile-drawer__auth">
        {session ? (
          <Link href="/login" className="dh-mobile-drawer__auth-link">
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </Link>
        ) : (
          <>
            <Link href="/login" className="dh-mobile-drawer__auth-link">
              <User size={16} aria-hidden="true" />
              Sign in
            </Link>
            <Link
              href="/register"
              className="dh-mobile-drawer__auth-link dh-mobile-drawer__auth-link--primary"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </Drawer>
  );
}

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

type NavSection = {
  title: string;
  links: NavLink[];
};

/**
 * Groups navigation links into sections based on their href prefix.
 * - `/candidate/*` → "Candidate"
 * - `/employer/*` → "Employer"
 * - `/admin/*` or `/platform/*` → "Admin"
 * - Everything else → "General"
 */
function groupLinksBySection(links: NavLink[]): NavSection[] {
  const general: NavLink[] = [];
  const candidate: NavLink[] = [];
  const employer: NavLink[] = [];
  const admin: NavLink[] = [];

  for (const link of links) {
    if (link.href.startsWith("/candidate")) {
      candidate.push(link);
    } else if (link.href.startsWith("/employer")) {
      employer.push(link);
    } else if (link.href.startsWith("/admin") || link.href.startsWith("/platform")) {
      admin.push(link);
    } else {
      general.push(link);
    }
  }

  const sections: NavSection[] = [];
  if (general.length > 0) sections.push({ title: "", links: general });
  if (candidate.length > 0) sections.push({ title: "Candidate", links: candidate });
  if (employer.length > 0) sections.push({ title: "Employer", links: employer });
  if (admin.length > 0) sections.push({ title: "Admin", links: admin });

  return sections;
}
