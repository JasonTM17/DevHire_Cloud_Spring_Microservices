# Cloud Visual Evidence

These diagrams are source-controlled evidence for the AWS blueprint. They are intentionally architecture/render evidence, not screenshots of a live AWS deployment.

## AWS Blueprint Map

```mermaid
flowchart TB
    Reviewer["Reviewer / CI"] --> Verify["cloud-verify.ps1"]
    Verify --> Terraform["Terraform AWS blueprint"]
    Verify --> Helm["Helm chart render"]
    Verify --> K8s["Raw Kubernetes render"]
    Verify --> Policy["cloud-policy-audit.ps1"]

    Terraform --> Network["VPC / subnets / security groups"]
    Terraform --> EKS["EKS / managed node group / IRSA"]
    Terraform --> Data["RDS / Redis / MSK / OpenSearch"]
    Terraform --> ECR["ECR immutable repositories"]
    Terraform --> Secrets["Secrets Manager references"]

    Helm --> ExternalSecrets["External Secrets"]
    Helm --> Workloads["Gateway / services / AI / frontend"]
    Helm --> Operations["HPA / PDB / NetworkPolicy / Quota"]

    K8s --> RawWorkloads["Raw manifests with SHA placeholders"]
    Policy --> Guardrails["No latest / private data plane / prod secret refs"]
```

## GitOps Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub master
    participant CI as GitHub Actions
    participant ECR as ECR / GHCR
    participant Argo as Argo CD
    participant EKS as EKS
    Dev->>GH: Merge reviewed change
    GH->>CI: CI, Docker, Security, Terraform, E2E
    CI->>ECR: Publish immutable SHA/release images
    Argo->>GH: Sync Helm values from master
    Argo->>EKS: Apply manifests with ExternalSecret refs
    EKS->>EKS: Rollout, probes, HPA, PDB, NetworkPolicy
```

## Verification Flow

```mermaid
flowchart LR
    A["terraform-race-smoke.ps1"] --> B["terraform-validate.ps1"]
    B --> C["fmt / init -backend=false / validate"]
    B --> D["TFLint"]
    B --> E["Trivy config scan"]
    F["cloud-policy-audit.ps1"] --> G["72 guardrail checks"]
    H["cloud-verify.ps1"] --> B
    H --> F
    H --> I["Helm lint/template"]
    H --> J["Kustomize render"]
    H --> K["kubeconform strict validation"]
    H --> L["cloud-evidence-summary.ps1"]
```

## Interpretation

- Green cloud verification means the blueprint is apply-ready as code.
- It does not mean an AWS account has been created or charged.
- Real apply requires the owner workflow in [cloud-apply-runbook.md](cloud-apply-runbook.md).
