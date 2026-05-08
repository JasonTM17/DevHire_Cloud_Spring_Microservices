import { Cloud, Database, GitBranch, LockKeyhole } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { OperationsEvidencePanel } from "@/components/OperationsEvidencePanel";

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
      <div className="panel">
        <h2>Blueprint service map</h2>
        <div className="table-list">
          {[
            { label: "Network", detail: "Private subnets, NAT egress, security groups, and ingress boundaries.", status: "Terraform" },
            { label: "EKS", detail: "Managed node groups, namespace policy, Helm releases, and Argo CD sync target.", status: "Helm" },
            { label: "Data services", detail: "RDS PostgreSQL, Redis, MSK, and OpenSearch are isolated behind VPC policy.", status: "Private" },
            { label: "Container registry", detail: "Immutable image tags, provenance labels, and deployment digest evidence.", status: "OCI" },
            { label: "Secrets", detail: "External Secrets reads AWS Secrets Manager references without checked-in values.", status: "Guarded" }
          ].map((item) => (
            <div className="table-row" key={item.label}>
              <span>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </span>
              <span className="badge">{item.status}</span>
            </div>
          ))}
        </div>
      </div>
      <OperationsEvidencePanel
        title="Cloud verification evidence"
        items={[
          {
            label: "Terraform validation",
            status: "PASSING",
            source: "scripts/terraform-validate.ps1",
            ownerAction: "Platform owner reviews plan drift"
          },
          {
            label: "Helm and K8s render",
            status: "PASSING",
            source: "scripts/cloud-verify.ps1",
            ownerAction: "Release owner compares rendered manifests"
          },
          {
            label: "Policy guardrails",
            status: "PASSING",
            source: "scripts/cloud-policy-audit.ps1",
            ownerAction: "Security reviewer signs off network and secret policy"
          },
          {
            label: "Apply runbook",
            status: "DOCUMENTED",
            source: "docs/cloud-apply-runbook.md",
            ownerAction: "Operator follows manual approval checklist",
            href: "/platform/releases"
          }
        ]}
      />
    </section>
  );
}
