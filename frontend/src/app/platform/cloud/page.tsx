import { Cloud, Database, GitBranch, LockKeyhole } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";

export default function PlatformCloudPage() {
  return (
    <section className="page-stack" data-testid="platform-cloud-page">
      <div className="hero-strip">
        <div>
          <p className="eyebrow">Infrastructure & K8s control plane</p>
          <h1>AWS apply-ready blueprint</h1>
          <p>Terraform, Helm, External Secrets, Argo CD, immutable images, and production guardrails without running apply.</p>
        </div>
        <div className="hero-actions">
          <span className="badge live">No AWS credentials required</span>
          <span className="badge">Blueprint only</span>
        </div>
      </div>
      <div className="metrics-row">
        <MetricCard icon={Cloud} label="EKS" value="Ready" helper="Managed node groups" />
        <MetricCard icon={Database} label="Data" value="Private" helper="RDS, Redis, MSK, OpenSearch" />
        <MetricCard icon={LockKeyhole} label="Secrets" value="External" helper="AWS Secrets Manager refs" />
        <MetricCard icon={GitBranch} label="GitOps" value="master" helper="Argo CD target" />
      </div>
      <div className="job-grid">
        {["Network", "EKS", "Data services", "Container registry", "Secrets"].map((item) => (
          <article className="job-card" key={item}>
            <h2>{item}</h2>
            <p>Validated through cloud verification scripts, policy audit, and reviewer-safe documentation.</p>
            <span className="badge">Terraform module</span>
          </article>
        ))}
      </div>
    </section>
  );
}
