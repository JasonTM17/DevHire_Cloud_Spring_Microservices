"use client";

import { useState } from "react";
import { Building2, ClipboardList, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { saveSession } from "@/lib/session";
import type { UserRole } from "@/types/domain";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("CANDIDATE");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const auth = await api.register({ email, password, role });
      saveSession(auth);
      router.push(role === "EMPLOYER" ? "/employer" : "/candidate");
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Registration failed");
    }
  }

  return (
    <section className="auth-grid" data-testid="register-page">
      <div className="panel auth-panel narrow">
        <div className="section-title">
          <UserPlus size={16} />
          <h1>Create account</h1>
        </div>
        <form className="form" onSubmit={submit}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
          </label>
          <label>
            Role
            <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
              <option value="CANDIDATE">Candidate</option>
              <option value="EMPLOYER">Employer</option>
            </select>
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="button primary" type="submit">
            <UserPlus size={16} />
            Register
          </button>
        </form>
      </div>
      <aside className="auth-brief">
        <p className="eyebrow">Role model</p>
        <h2>Separate workspaces, same platform</h2>
        <div className="timeline">
          <div className="pipeline-step">
            <span className="step-index">
              <ClipboardList size={14} />
            </span>
            <span>
              <strong>Candidate</strong>
              <small className="muted">Search jobs, submit CV URL, track status.</small>
            </span>
          </div>
          <div className="pipeline-step">
            <span className="step-index">
              <Building2 size={14} />
            </span>
            <span>
              <strong>Employer</strong>
              <small className="muted">Create company, submit jobs, review applicants.</small>
            </span>
          </div>
        </div>
      </aside>
    </section>
  );
}
