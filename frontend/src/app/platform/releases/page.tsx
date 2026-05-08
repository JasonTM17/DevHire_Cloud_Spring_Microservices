import { BadgeCheck, Boxes, GitPullRequestArrow, ShieldCheck } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { OperationsEvidencePanel } from "@/components/OperationsEvidencePanel";

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
        <MetricCard icon={BadgeCheck} label="Public release" value="v0.5.1" helper="v0.6.x is under PR review" />
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
      <OperationsEvidencePanel
        title="Reviewer release trail"
        items={[
          { label: "Protected branch checks", status: "ENFORCED", source: ".github/settings.yml" },
          { label: "Release notes", status: "CURRENT", source: "docs/release-notes/v0.5.1.md" },
          { label: "v0.6 Stitch evidence", status: "IN_REVIEW", source: "docs/ui-redesign-v0.6.md" },
          { label: "Security evidence", status: "GREEN", source: "docs/security-evidence.md" }
        ]}
      />
    </section>
  );
}
