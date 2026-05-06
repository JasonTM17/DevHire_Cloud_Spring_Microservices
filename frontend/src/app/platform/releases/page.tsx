import { BadgeCheck, Boxes, GitPullRequestArrow, ShieldCheck } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";

export default function PlatformReleasesPage() {
  return (
    <section className="page-stack" data-testid="platform-releases-page">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">CI/CD & deployment registry</p>
          <h1>Release evidence and provenance</h1>
          <p>Protected branch flow, green workflows, Docker metadata, SBOM/security scans, and release evidence for reviewers.</p>
        </div>
        <div className="hero-actions">
          <span className="badge live">Protected master</span>
          <span className="badge">PR based delivery</span>
        </div>
      </div>
      <div className="metrics-row">
        <MetricCard icon={GitPullRequestArrow} label="PR queue" value="0" helper="Curated dependency noise" />
        <MetricCard icon={BadgeCheck} label="Latest" value="v0.5.1" helper="Public release" />
        <MetricCard icon={Boxes} label="Images" value="OCI" helper="Labels and provenance" />
        <MetricCard icon={ShieldCheck} label="Security" value="Green" helper="CodeQL, Trivy, Gitleaks" />
      </div>
      <div className="table-list">
        {["CI", "Docker Images", "Documentation", "Security", "CodeQL", "Terraform", "E2E"].map((workflow) => (
          <div className="table-row" key={workflow}>
            <strong>{workflow}</strong>
            <span className="badge live">Required evidence</span>
          </div>
        ))}
      </div>
    </section>
  );
}
