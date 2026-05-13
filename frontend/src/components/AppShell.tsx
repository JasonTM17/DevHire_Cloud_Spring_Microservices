"use client";

import {
  Bell,
  ChevronDown,
  Code2,
  LogOut,
  Menu,
  Search,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { clearSession, getSession } from "@/lib/session";
import type { UserRole } from "@/types/domain";

type NavLink = {
  href: string;
  label: string;
  roles?: UserRole[];
};

const mainNav: NavLink[] = [
  { href: "/jobs", label: "IT Jobs" },
  { href: "/challenges", label: "Coding Challenges" },
  { href: "/companies", label: "Companies" },
  { href: "/community", label: "Community" },
];

const candidateNav: NavLink[] = [
  { href: "/candidate", label: "Dashboard", roles: ["CANDIDATE"] },
  { href: "/candidate/applications", label: "Applications", roles: ["CANDIDATE"] },
  { href: "/candidate/assessments", label: "Code Studio", roles: ["CANDIDATE"] },
  { href: "/candidate/profile", label: "Profile", roles: ["CANDIDATE"] },
  { href: "/challenges/submissions", label: "Submissions", roles: ["CANDIDATE"] },
  { href: "/challenges/leaderboard", label: "Leaderboard", roles: ["CANDIDATE"] },
];

const employerNav: NavLink[] = [
  { href: "/employer", label: "Pipeline", roles: ["EMPLOYER"] },
];

const adminNav: NavLink[] = [
  { href: "/admin", label: "Admin Console", roles: ["ADMIN"] },
  { href: "/admin/ai", label: "AI Ops", roles: ["ADMIN"] },
  { href: "/platform/observability", label: "Observability", roles: ["ADMIN"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [globalSearch, setGlobalSearch] = useState("");
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const isAssessmentIDE = pathname === "/candidate/assessments";
  if (isAssessmentIDE && session?.user.role === "CANDIDATE") {
    return <>{children}</>;
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = globalSearch.trim();
    router.push(keyword ? `/jobs?search=${encodeURIComponent(keyword)}` : "/jobs");
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    router.push("/login");
  }

  const role = session?.user.role;
  const roleNav = role === "ADMIN" ? adminNav : role === "EMPLOYER" ? employerNav : role === "CANDIDATE" ? candidateNav : [];

  return (
    <div className="itviec-app">
      <header className="itviec-header">
        <div className="itviec-header__inner">
          <Link href="/" className="itviec-header__logo">
            <Code2 size={28} strokeWidth={2.5} />
            <span className="itviec-header__logo-text">
              <strong>DevHire</strong>
              <small>Cloud</small>
            </span>
          </Link>

          <nav className="itviec-header__nav" aria-label="Main navigation">
            {mainNav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`itviec-header__nav-link ${pathname === link.href || pathname.startsWith(link.href + "/") ? "active" : ""}`}
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
                  >
                    <span className="itviec-header__avatar">
                      {session.user.email.charAt(0).toUpperCase()}
                    </span>
                    <ChevronDown size={14} />
                  </button>
                  {userMenuOpen && (
                    <div className="itviec-header__dropdown">
                      <div className="itviec-header__dropdown-info">
                        <strong>{session.user.role}</strong>
                        <small>{session.user.email}</small>
                      </div>
                      <div className="itviec-header__dropdown-divider" />
                      {roleNav.map((link) => (
                        <Link key={link.href} href={link.href} className="itviec-header__dropdown-item">
                          {link.label}
                        </Link>
                      ))}
                      <div className="itviec-header__dropdown-divider" />
                      <button className="itviec-header__dropdown-item itviec-header__dropdown-item--danger" onClick={handleLogout} type="button">
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

            <button
              className="itviec-header__mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="itviec-header__mobile-menu">
            {mainNav.map((link) => (
              <Link key={link.href} href={link.href} className="itviec-header__mobile-link">
                {link.label}
              </Link>
            ))}
            {roleNav.length > 0 && (
              <>
                <div className="itviec-header__dropdown-divider" />
                {roleNav.map((link) => (
                  <Link key={link.href} href={link.href} className="itviec-header__mobile-link">
                    {link.label}
                  </Link>
                ))}
              </>
            )}
          </div>
        )}
      </header>

      <main className="itviec-main">
        {children}
      </main>

      <footer className="itviec-footer">
        <div className="itviec-footer__inner">
          <div className="itviec-footer__brand">
            <Code2 size={24} />
            <span><strong>DevHire Cloud</strong></span>
            <p>IT hiring platform with integrated coding assessment.</p>
          </div>
          <div className="itviec-footer__links">
            <div>
              <h4>Candidates</h4>
              <Link href="/jobs">IT Jobs</Link>
              <Link href="/challenges">Coding Challenges</Link>
              <Link href="/challenges/leaderboard">Leaderboard</Link>
            </div>
            <div>
              <h4>Employers</h4>
              <Link href="/employer">Hiring pipeline</Link>
              <Link href="/companies">IT Companies</Link>
            </div>
            <div>
              <h4>Platform</h4>
              <Link href="/assistant">AI Assistant</Link>
              <Link href="/community">Community</Link>
            </div>
          </div>
        </div>
        <div className="itviec-footer__bottom">
          <span>(c) 2026 DevHire Cloud. Built by Nguyen Son - jasonbmt06@gmail.com</span>
        </div>
      </footer>
    </div>
  );
}
