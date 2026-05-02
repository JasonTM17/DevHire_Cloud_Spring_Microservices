"use client";

import { BriefcaseBusiness, Building2, ClipboardList, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getSession } from "@/lib/session";

const navItems = [
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/candidate", label: "Candidate", icon: ClipboardList },
  { href: "/employer", label: "Employer", icon: Building2 },
  { href: "/admin", label: "Admin", icon: ShieldCheck }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = typeof window === "undefined" ? null : getSession();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/jobs" className="brand" aria-label="DevHire Cloud jobs">
          <Image src="/devhire-mark.svg" alt="" width={42} height={42} priority />
          <span>DevHire Cloud</span>
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
        <div className="sidebar-footer">
          {session ? (
            <>
              <div className="identity">
                <LayoutDashboard size={16} />
                <span>{session.user.role}</span>
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
              Sign in
            </Link>
          )}
        </div>
      </aside>
      <main className="workspace">{children}</main>
    </div>
  );
}
