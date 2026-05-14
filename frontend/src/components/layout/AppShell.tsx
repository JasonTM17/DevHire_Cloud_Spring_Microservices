"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useNotifications } from "@/hooks/useNotifications";
import { filterNavByRole, navLinks, selectNavMode } from "@/lib/navLinks";
import { getSession } from "@/lib/session";
import type { NavMode, NavUserRole } from "@/lib/navLinks";
import type { Session } from "@/lib/session";
import { SkipLink } from "@/components/layout/SkipLink";
import { TopBar } from "@/components/layout/TopBar";
import { CondensedTopBar } from "@/components/layout/CondensedTopBar";
import { MobileTopBar } from "@/components/layout/MobileTopBar";

/**
 * AppShell — Responsive application shell with proper landmark roles.
 *
 * Detects pathname, user role, and viewport to determine layout:
 * - IDE fullscreen mode: `/candidate/assessments/*` for CANDIDATE role → raw children
 * - Otherwise: SkipLink + <header> (TopBar variant) + <main id="main-content"> + <footer>
 *
 * Requirements: 2.1, 2.2, 2.3, 2.6, 4.1
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 768px)");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setSession(getSession());
  }, [pathname]);

  // Notification count for bell badge integration
  const token = session?.accessToken ?? "";
  const { unreadCount } = useNotifications(token);

  // Determine nav mode using selectNavMode (breakpoints: 768/1024)
  // useMediaQuery provides SSR-safe boolean signals matching the same thresholds
  const navMode: NavMode = selectNavMode(
    isDesktop ? 1024 : isTablet ? 768 : 0
  );

  // Derive role and filtered nav links
  const role: NavUserRole = session?.user.role ?? "PUBLIC";
  const links = useMemo(() => filterNavByRole(navLinks, role), [role]);
  const requiredRole = requiredRoleForPath(pathname);
  const isAccessDenied = Boolean(session && requiredRole && role !== requiredRole);

  const user = session
    ? { name: session.user.email, avatarUrl: undefined }
    : undefined;

  // IDE fullscreen mode: candidate assessments route with CANDIDATE role
  const isAssessmentIDE =
    pathname.startsWith("/candidate/assessments/") ||
    pathname === "/candidate/assessments";

  if (isAssessmentIDE && role === "CANDIDATE") {
    return <>{children}</>;
  }

  const mainContent = isAccessDenied ? (
    <AccessDenied currentRole={role} requiredRole={requiredRole!} />
  ) : children;

  return (
    <>
      <SkipLink />
      <header>
        {navMode === "desktop" && (
          <TopBar
            links={links}
            user={user}
            session={session}
            notificationCount={unreadCount}
          />
        )}
        {navMode === "condensed" && (
          <CondensedTopBar
            links={links}
            user={user}
            notificationCount={unreadCount}
          />
        )}
        {navMode === "mobile" && <MobileTopBar links={links} user={user} session={session} />}
      </header>
      <main id="main-content" role="main">
        {mainContent}
      </main>
      <footer role="contentinfo" className="dh-app-footer">
        <p>&copy; {new Date().getFullYear()} DevHire Cloud. All rights reserved.</p>
      </footer>
    </>
  );
}

function requiredRoleForPath(pathname: string): NavUserRole | null {
  if (pathname.startsWith("/admin") || pathname.startsWith("/platform")) return "ADMIN";
  if (pathname.startsWith("/employer")) return "EMPLOYER";
  if (pathname.startsWith("/candidate")) return "CANDIDATE";
  return null;
}

function AccessDenied({
  currentRole,
  requiredRole,
}: {
  currentRole: NavUserRole;
  requiredRole: NavUserRole;
}) {
  return (
    <section className="access-denied panel" data-testid="access-denied">
      <p className="eyebrow">Access control</p>
      <h2>Workspace unavailable for this role</h2>
      <p>
        Required role <strong>{requiredRole}</strong>. Current session <strong>{currentRole}</strong>.
        Switch accounts from the sign-in page to inspect this workspace.
      </p>
    </section>
  );
}
