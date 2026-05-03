"use client";

import {
  Activity,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  Cloud,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Search,
  ShieldCheck,
  UserRoundCheck
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getSession } from "@/lib/session";

const navItems = [
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/assistant", label: "AI Assistant", icon: Bot },
  { href: "/candidate", label: "Candidate", icon: ClipboardList },
  { href: "/employer", label: "Employer", icon: Building2 },
  { href: "/admin", label: "Admin", icon: ShieldCheck }
];

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/jobs": {
    title: "Recruitment Operations Workspace",
    subtitle: "Published roles, search signals, and production health in one surface."
  },
  "/assistant": {
    title: "Claude AI Portfolio Assistant",
    subtitle: "RAG answers, citations, and tool traces over the DevHire Cloud platform."
  },
  "/candidate": {
    title: "Candidate Command Center",
    subtitle: "Track applications, notifications, and interview movement."
  },
  "/employer": {
    title: "Employer Hiring Console",
    subtitle: "Manage company onboarding, job review, and applicant pipeline."
  },
  "/admin": {
    title: "Administrative Control Plane",
    subtitle: "Approve companies, promote jobs, and inspect audit events."
  },
  "/login": {
    title: "Secure Access",
    subtitle: "Role-based JWT session for the DevHire Cloud portfolio."
  },
  "/register": {
    title: "Create Workspace Account",
    subtitle: "Register as candidate or employer and enter the platform."
  }
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = typeof window === "undefined" ? null : getSession();
  const meta = pageMeta[pathname] ?? pageMeta["/jobs"];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/jobs" className="brand" aria-label="DevHire Cloud jobs">
          <Image src="/devhire-mark.svg" alt="" width={42} height={42} priority />
          <span className="brand-copy">
            <span>DevHire Cloud</span>
            <small>Microservices hiring OS</small>
          </span>
        </Link>
        <nav className="nav-list" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={active ? "nav-item active" : "nav-item"}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="rail-health" aria-label="Platform health">
          <span className="rail-kicker">Platform signals</span>
          <div className="rail-health-row">
            <span>Gateway</span>
            <span>:8080</span>
          </div>
          <div className="rail-health-row">
            <span>Kafka outbox</span>
            <span>Tracked</span>
          </div>
          <div className="rail-health-row">
            <span>OpenSearch</span>
            <span>Adapter</span>
          </div>
          <div className="rail-health-row">
            <span>Claude AI</span>
            <span>Haiku</span>
          </div>
          <div className="rail-health-row">
            <span>CI/CD</span>
            <GitBranch size={14} />
          </div>
        </div>
        <div className="sidebar-footer">
          {session ? (
            <>
              <div className="identity">
                <span className="identity-mark">
                  <LayoutDashboard size={16} />
                </span>
                <span>
                  <span>{session.user.role}</span>
                  <small>{session.user.email}</small>
                </span>
              </div>
              <button
                className="button ghost"
                type="button"
                onClick={() => {
                  clearSession();
                  router.push("/login");
                }}
              >
                <LogOut size={16} />
                Sign out
              </button>
            </>
          ) : (
            <Link className="button primary" href="/login">
              <UserRoundCheck size={16} />
              Sign in
            </Link>
          )}
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div>
            <div className="topbar-actions">
              <span className="badge live">
                <Cloud size={13} />
                API Gateway :8080
              </span>
              <span className="badge">
                <Activity size={13} />
                SLO monitored
              </span>
            </div>
            <h1>{meta.title}</h1>
            <p>{meta.subtitle}</p>
          </div>
          <div className="topbar-actions">
            <label className="top-search" aria-label="Global search">
              <Search size={16} />
              <input placeholder="Search jobs, companies, audit logs" />
            </label>
            <Link className="button outline" href="/candidate" aria-label="Notifications">
              <Bell size={16} />
            </Link>
            {session ? (
              <button
                className="button outline"
                type="button"
                onClick={() => {
                  clearSession();
                  router.push("/login");
                }}
              >
                <LogOut size={16} />
                Sign out
              </button>
            ) : (
              <Link className="button primary" href="/login">
                <UserRoundCheck size={16} />
                Sign in
              </Link>
            )}
          </div>
        </header>
        <main className="workspace">{children}</main>
      </div>
    </div>
  );
}
