"use client";

import { useState } from "react";
import { DatabaseZap, LockKeyhole, Route, ShieldCheck, UserRoundCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { saveSession } from "@/lib/session";

const demos = [
  ["ADMIN", "admin@devhire.local", "Admin@123456"],
  ["EMPLOYER", "employer@devhire.local", "Employer@123456"],
  ["CANDIDATE", "candidate@devhire.local", "Candidate@123456"]
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("candidate@devhire.local");
  const [password, setPassword] = useState("Candidate@123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const auth = await api.login({ email, password });
      saveSession(auth);
      router.push(auth.role === "ADMIN" ? "/admin" : auth.role === "EMPLOYER" ? "/employer" : "/candidate");
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-grid" data-testid="login-page">
      <div className="panel auth-panel">
        <div className="section-title">
          <LockKeyhole size={20} />
          <h1>Sign in</h1>
        </div>
        <form className="form" data-testid="login-form" onSubmit={submit}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button className="button primary" disabled={loading} type="submit">
            <UserRoundCheck size={16} />
            {loading ? "Signing in" : "Sign in"}
          </button>
        </form>
      </div>
      <div className="auth-brief">
        <p className="eyebrow">Portfolio access</p>
        <h2>Demo accounts</h2>
        <p>
          Pick a role to inspect the real API flow through Gateway, JWT authentication, RBAC, and service-owned
          dashboards.
        </p>
        <div className="stack">
          {demos.map(([role, demoEmail, demoPassword]) => (
            <button
              className="demo-account"
              key={role}
              type="button"
              onClick={() => {
                setEmail(demoEmail);
                setPassword(demoPassword);
              }}
            >
              <span>{role}</span>
              <strong>{demoEmail}</strong>
            </button>
          ))}
        </div>
        <div className="timeline">
          <div className="pipeline-step">
            <span className="step-index">
              <ShieldCheck size={14} />
            </span>
            <span>
              <strong>BCrypt + JWT</strong>
              <small className="muted">Access and refresh token rotation</small>
            </span>
          </div>
          <div className="pipeline-step">
            <span className="step-index">
              <Route size={14} />
            </span>
            <span>
              <strong>Gateway routing</strong>
              <small className="muted">Centralized auth and rate limit</small>
            </span>
          </div>
          <div className="pipeline-step">
            <span className="step-index">
              <DatabaseZap size={14} />
            </span>
            <span>
              <strong>Audit event</strong>
              <small className="muted">Login is published to audit-service</small>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
