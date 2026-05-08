"use client";

import {
  Activity,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  ChartSpline,
  ClipboardList,
  Cloud,
  FileCheck2,
  GitBranch,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Map,
  Search,
  ShieldCheck,
  UserRoundCheck,
  UsersRound
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { clearSession, getSession } from "@/lib/session";

const navGroups = [
  {
    label: "Candidate",
    items: [
      { href: "/jobs", label: "Discover Jobs", icon: BriefcaseBusiness },
      { href: "/candidate", label: "Candidate Home", icon: ClipboardList },
      { href: "/candidate/applications", label: "Applications", icon: FileCheck2 },
      { href: "/candidate/profile", label: "Profile", icon: UserRoundCheck },
      { href: "/candidate/assessments", label: "Code Studio", icon: GraduationCap },
      { href: "/candidate/offers", label: "Offers", icon: ShieldCheck },
      { href: "/candidate/interview-prep", label: "Interview Prep", icon: Bot },
      { href: "/candidate/roadmap", label: "Roadmap", icon: Map },
      { href: "/candidate/skill-analytics", label: "Skill Analytics", icon: ChartSpline },
      { href: "/community", label: "Community", icon: UsersRound }
    ]
  },
  {
    label: "Employer",
    items: [
      { href: "/employer", label: "Hiring Pipeline", icon: Building2 }
    ]
  },
  {
    label: "Admin/Ops",
    items: [
      { href: "/admin", label: "Admin Control", icon: ShieldCheck },
      { href: "/admin/ai", label: "AI Operations", icon: Bot }
    ]
  },
  {
    label: "Platform",
    items: [
      { href: "/assistant", label: "AI Assistant", icon: Bot },
      { href: "/platform/observability", label: "Observability", icon: ChartSpline },
      { href: "/platform/cloud", label: "Cloud Blueprint", icon: Cloud },
      { href: "/platform/releases", label: "Releases", icon: GitBranch }
    ]
  }
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
    title: "Candidate Career Hub",
    subtitle: "Applications, offers, skill proof, roadmap, and interview prep for cloud backend roles."
  },
  "/candidate/applications": {
    title: "Application Tracker",
    subtitle: "A candidate-facing pipeline for status movement, duplicate protection, and offer readiness."
  },
  "/candidate/profile": {
    title: "Candidate Profile",
    subtitle: "Portfolio-grade profile and preferences for job matching."
  },
  "/candidate/assessments": {
    title: "Code Assessment Studio",
    subtitle: "Reviewer-safe grading, rubric evidence, attempt metadata, and employer decision support."
  },
  "/candidate/offers": {
    title: "Offer Review",
    subtitle: "Offer letters, compensation signals, and acceptance checkpoints."
  },
  "/candidate/interview-prep": {
    title: "AI Interview Prep",
    subtitle: "Claude-backed practice prompts, citations, and tool traces for production interviews."
  },
  "/candidate/roadmap": {
    title: "Cloud Career Roadmap",
    subtitle: "Milestones, readiness score, and next actions for senior backend growth."
  },
  "/candidate/skill-analytics": {
    title: "Cloud Skill Analytics",
    subtitle: "Market demand, salary bands, locations, and skill frequency from published jobs."
  },
  "/employer": {
    title: "Employer Hiring Console",
    subtitle: "Manage company onboarding, job review, and applicant pipeline."
  },
  "/admin": {
    title: "Administrative Control Plane",
    subtitle: "Approve companies, promote jobs, and inspect audit events."
  },
  "/admin/ai": {
    title: "AI Operations",
    subtitle: "Provider posture, knowledge reindexing, safety controls, and assistant evidence."
  },
  "/platform/observability": {
    title: "Observability & Event Streaming",
    subtitle: "Domain KPIs, event reliability, SLO posture, and operational runbooks."
  },
  "/platform/cloud": {
    title: "Infrastructure & K8s Control Plane",
    subtitle: "AWS blueprint, Helm, External Secrets, GitOps, and deployment guardrails."
  },
  "/platform/releases": {
    title: "CI/CD & Deployment Registry",
    subtitle: "Release evidence, workflow status, image provenance, and reviewer verification."
  },
  "/community": {
    title: "Engineering Community Hub",
    subtitle: "Curated learning paths, portfolio proof, and cloud backend interview practice."
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
  const [globalSearch, setGlobalSearch] = useState("");
  const session = typeof window === "undefined" ? null : getSession();
  const meta = resolvePageMeta(pathname);
  const workspaceHref = session?.user.role === "ADMIN"
    ? "/admin"
    : session?.user.role === "EMPLOYER" ? "/employer" : "/candidate";

  function submitGlobalSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const keyword = globalSearch.trim();
    if (!keyword) {
      router.push("/jobs");
      return;
    }
    router.push(`/jobs?keyword=${encodeURIComponent(keyword)}`);
  }

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
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                const expandsToNestedRoute = !["/candidate", "/admin"].includes(item.href);
                const active = pathname === item.href || (expandsToNestedRoute && pathname.startsWith(`${item.href}/`));
                return (
                  <Link key={item.href} href={item.href} className={active ? "nav-item active" : "nav-item"}>
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
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
                <span className="identity-copy" title={`${session.user.role} - ${session.user.email}`}>
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
            <form className="top-search" aria-label="Global job search" onSubmit={submitGlobalSearch}>
              <Search size={16} />
              <input
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                placeholder="Search published jobs"
              />
            </form>
            <Link className="button outline" href={workspaceHref} aria-label="Workspace notifications">
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

function resolvePageMeta(pathname: string) {
  if (pageMeta[pathname]) {
    return pageMeta[pathname];
  }
  if (pathname.startsWith("/jobs/")) {
    return {
      title: "Job Detail",
      subtitle: "Role requirements, company signals, application status, and assessment readiness."
    };
  }
  if (pathname.startsWith("/companies/")) {
    return {
      title: "Company Profile",
      subtitle: "Approved employer profile, published roles, hiring signals, and code-review readiness."
    };
  }
  return pageMeta["/jobs"];
}
