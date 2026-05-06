[CmdletBinding()]
param(
    [string]$ReportDir = "reports/cloud-policy-audit"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$reportRoot = if ([System.IO.Path]::IsPathRooted($ReportDir)) {
    [System.IO.Path]::GetFullPath($ReportDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ReportDir))
}

$requiredServices = @(
    "frontend",
    "api-gateway",
    "auth-service",
    "user-service",
    "company-service",
    "job-service",
    "application-service",
    "notification-service",
    "audit-service",
    "ai-service"
)

$checks = [System.Collections.Generic.List[object]]::new()

function Add-Check {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][bool]$Passed,
        [string]$Detail = ""
    )

    $checks.Add([pscustomobject]@{
        name = $Name
        status = if ($Passed) { "passed" } else { "failed" }
        detail = $Detail
    })

    if ($Passed) {
        Write-Host "PASS $Name"
    } else {
        Write-Host "FAIL $Name"
        if ($Detail) {
            Write-Host "  $Detail"
        }
    }
}

function Read-RepoFile {
    param([Parameter(Mandatory = $true)][string]$Path)
    return Get-Content -Raw -Path (Join-Path $repoRoot $Path)
}

function Test-Contains {
    param(
        [Parameter(Mandatory = $true)][string]$Text,
        [Parameter(Mandatory = $true)][string]$Pattern
    )
    $options = [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Multiline
    return [regex]::IsMatch($Text, $Pattern, $options)
}

function Assert-Contains {
    param(
        [string]$Name,
        [string]$Text,
        [string]$Pattern,
        [string]$Detail
    )
    Add-Check -Name $Name -Passed (Test-Contains -Text $Text -Pattern $Pattern) -Detail $Detail
}

function Assert-NotContains {
    param(
        [string]$Name,
        [string]$Text,
        [string]$Pattern,
        [string]$Detail
    )
    Add-Check -Name $Name -Passed (-not (Test-Contains -Text $Text -Pattern $Pattern)) -Detail $Detail
}

Push-Location $repoRoot
try {
    $rawServices = Read-RepoFile "deploy/k8s/services.yaml"
    $rawKustomization = Read-RepoFile "deploy/k8s/kustomization.yaml"
    $helmDefaults = Read-RepoFile "deploy/helm/devhire-cloud/values.yaml"
    $helmProd = Read-RepoFile "deploy/helm/devhire-cloud/values-prod.yaml"
    $helmAwsStaging = Read-RepoFile "deploy/helm/devhire-cloud/values-aws-staging.yaml"
    $helmAwsProd = Read-RepoFile "deploy/helm/devhire-cloud/values-aws-prod.yaml"
    $gitopsLocal = Read-RepoFile "deploy/gitops/argocd-application.yaml"
    $gitopsAws = Read-RepoFile "deploy/gitops/argocd-aws-application.yaml"
    $tfData = Read-RepoFile "deploy/terraform/aws/modules/data/main.tf"
    $tfEks = Read-RepoFile "deploy/terraform/aws/modules/eks/main.tf"
    $tfContainer = Read-RepoFile "deploy/terraform/aws/modules/container/main.tf"
    $tfProdVariables = Read-RepoFile "deploy/terraform/aws/environments/prod/variables.tf"

    foreach ($service in $requiredServices) {
        Assert-Contains -Name "raw k8s deployment/service includes $service" -Text $rawServices -Pattern "name:\s*$([regex]::Escape($service))\b" -Detail "deploy/k8s/services.yaml must include every runtime service."
        Assert-Contains -Name "raw k8s image kustomization includes $service" -Text $rawKustomization -Pattern "devhire/$([regex]::Escape($service))" -Detail "deploy/k8s/kustomization.yaml must rewrite every runtime image."
        Assert-Contains -Name "helm values include $service" -Text $helmDefaults -Pattern "^\s{2}$([regex]::Escape($service)):" -Detail "deploy/helm/devhire-cloud/values.yaml must define every runtime service."
    }

    Assert-NotContains -Name "raw k8s does not use latest image tags" -Text ($rawServices + $rawKustomization) -Pattern "(:latest|newTag:\s*latest)" -Detail "Raw Kubernetes manifests must use release/SHA placeholders."
    Assert-NotContains -Name "helm defaults do not use latest image tags" -Text $helmDefaults -Pattern "imageTag:\s*latest" -Detail "Helm defaults must avoid mutable tags."
    Assert-Contains -Name "helm prod uses immutable replacement tag" -Text $helmProd -Pattern "imageTag:\s*sha-REPLACE_WITH_GIT_SHA" -Detail "Production values must force a SHA replacement marker."
    Assert-Contains -Name "helm prod pulls immutable tag on rollout" -Text $helmProd -Pattern "imagePullPolicy:\s*Always" -Detail "Production values must pull the selected immutable image tag."
    Assert-Contains -Name "helm prod requires secret refs" -Text $helmProd -Pattern "requireSecretRefs:\s*true" -Detail "Production workloads must not silently boot without Kubernetes secrets."
    Assert-Contains -Name "helm prod does not create example secrets" -Text $helmProd -Pattern "createExample:\s*false" -Detail "Production values must not create placeholder secrets."
    Assert-Contains -Name "helm prod uses reserved invalid placeholder domain" -Text $helmProd -Pattern "publicDomain:\s*devhire\.invalid" -Detail "The default placeholder domain must be explicit and non-routable."

    foreach ($valuesName in @("aws staging", "aws prod")) {
        $valuesText = if ($valuesName -eq "aws staging") { $helmAwsStaging } else { $helmAwsProd }
        Assert-Contains -Name "helm $valuesName enables External Secrets" -Text $valuesText -Pattern "externalSecrets:\s*\r?\n\s+enabled:\s*true" -Detail "AWS values must source runtime secret refs from External Secrets."
        Assert-Contains -Name "helm $valuesName disables example secrets" -Text $valuesText -Pattern "createExample:\s*false" -Detail "AWS values must not generate local placeholder secrets."
        Assert-Contains -Name "helm $valuesName uses EKS IRSA annotation" -Text $valuesText -Pattern "eks\.amazonaws\.com/role-arn" -Detail "AWS values must show IRSA wiring for External Secrets/workloads."
        Assert-Contains -Name "helm $valuesName uses non-latest immutable placeholder tag" -Text $valuesText -Pattern "imageTag:\s*(replace-with-release-sha|replace-with-git-sha)" -Detail "AWS values must be wired to release or commit SHA image tags."
    }

    Assert-Contains -Name "GitOps local sample tracks master" -Text $gitopsLocal -Pattern "targetRevision:\s*master" -Detail "Repo default branch is master."
    Assert-Contains -Name "GitOps AWS sample tracks master" -Text $gitopsAws -Pattern "targetRevision:\s*master" -Detail "Repo default branch is master."
    Assert-NotContains -Name "GitOps samples do not track main" -Text ($gitopsLocal + $gitopsAws) -Pattern "targetRevision:\s*main" -Detail "GitOps samples must not point at the wrong branch."

    Assert-Contains -Name "ECR repositories are immutable" -Text $tfContainer -Pattern 'image_tag_mutability\s*=\s*"IMMUTABLE"' -Detail "ECR must prevent tag overwrite."
    Assert-Contains -Name "ECR scan on push enabled" -Text $tfContainer -Pattern "scan_on_push\s*=\s*true" -Detail "ECR image scanning must be enabled."
    Assert-Contains -Name "ECR lifecycle policy exists" -Text $tfContainer -Pattern "aws_ecr_lifecycle_policy" -Detail "ECR must have retention guardrails."

    Assert-Contains -Name "RDS storage is encrypted" -Text $tfData -Pattern "storage_encrypted\s*=\s*true" -Detail "RDS must be encrypted at rest."
    Assert-Contains -Name "RDS is private" -Text $tfData -Pattern "publicly_accessible\s*=\s*false" -Detail "RDS must not be publicly reachable."
    Assert-Contains -Name "RDS deletion protection enabled" -Text $tfData -Pattern "deletion_protection\s*=\s*(true|var\.postgres_deletion_protection)" -Detail "RDS deletion protection is required for apply-ready prod posture."
    Assert-Contains -Name "RDS backups configured" -Text $tfData -Pattern "backup_retention_period\s*=\s*([1-9]|var\.postgres_backup_retention_period)" -Detail "RDS must have backup retention."
    Assert-Contains -Name "RDS CloudWatch log exports configured" -Text $tfData -Pattern "enabled_cloudwatch_logs_exports" -Detail "RDS PostgreSQL logs must be exportable for incident review."
    Assert-Contains -Name "RDS snapshots keep ownership tags" -Text $tfData -Pattern "copy_tags_to_snapshot\s*=" -Detail "RDS snapshots must retain tags for cost and ownership tracing."
    Assert-Contains -Name "Redis at-rest encryption enabled" -Text $tfData -Pattern "at_rest_encryption_enabled\s*=\s*true" -Detail "Redis data must be encrypted at rest."
    Assert-Contains -Name "Redis transit encryption enabled" -Text $tfData -Pattern "transit_encryption_enabled\s*=\s*true" -Detail "Redis traffic must use TLS."
    Assert-Contains -Name "MSK IAM auth enabled" -Text $tfData -Pattern "iam\s*\{\s*\r?\n\s*enabled\s*=\s*true" -Detail "MSK Serverless should use IAM client authentication."
    Assert-Contains -Name "OpenSearch at-rest encryption enabled" -Text $tfData -Pattern "encrypt_at_rest\s*\{\s*\r?\n\s*enabled\s*=\s*true" -Detail "OpenSearch data must be encrypted at rest."
    Assert-Contains -Name "OpenSearch node-to-node encryption enabled" -Text $tfData -Pattern "node_to_node_encryption\s*\{\s*\r?\n\s*enabled\s*=\s*true" -Detail "OpenSearch node traffic must be encrypted."
    Assert-Contains -Name "OpenSearch HTTPS enforced" -Text $tfData -Pattern "enforce_https\s*=\s*true" -Detail "OpenSearch endpoint must enforce HTTPS."
    Assert-Contains -Name "EKS control-plane logs enabled" -Text $tfEks -Pattern "enabled_cluster_log_types\s*=\s*\[" -Detail "EKS control-plane audit logs must be enabled."
    Assert-Contains -Name "EKS IRSA provider declared" -Text $tfEks -Pattern "aws_iam_openid_connect_provider" -Detail "IRSA/OIDC must be present for AWS workload identity."
    Assert-Contains -Name "EKS public endpoint CIDRs are restricted" -Text $tfEks -Pattern "public_access_cidrs\s*=\s*var\.endpoint_public_access\s*\?\s*var\.public_access_cidrs" -Detail "EKS public endpoint access must be constrained when enabled."

    foreach ($flag in @("enable_eks", "enable_rds", "enable_redis", "enable_msk", "enable_opensearch", "enable_nat_gateway")) {
        $flagPattern = 'variable\s+"' + [regex]::Escape($flag) + '"[\s\S]*?default\s*=\s*false'
        Assert-Contains -Name "prod Terraform $flag defaults disabled" -Text $tfProdVariables -Pattern $flagPattern -Detail "Blueprint-safe prod examples must not create expensive AWS resources by default."
    }
} finally {
    Pop-Location
}

$failed = @($checks | Where-Object { $_.status -ne "passed" })
$status = if ($failed.Count -eq 0) { "passed" } else { "failed" }

New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $reportRoot "cloud-policy-audit-$stamp.json"
$mdPath = Join-Path $reportRoot "cloud-policy-audit-$stamp.md"

$report = [pscustomobject]@{
    status = $status
    generatedAt = (Get-Date).ToString("o")
    checks = @($checks)
}
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# Cloud Policy Audit")
$lines.Add("")
$lines.Add("- Status: $status")
$lines.Add("- Terraform apply: not run")
$lines.Add("- AWS credentials required: false")
$lines.Add("")
$lines.Add("| Check | Status | Detail |")
$lines.Add("|---|---|---|")
foreach ($check in $checks) {
    $safeDetail = ($check.detail -replace "\|", "\|")
    $lines.Add("| $($check.name) | $($check.status) | $safeDetail |")
}
$lines | Set-Content -Path $mdPath -Encoding UTF8

Write-Host ""
Write-Host "Cloud policy audit summary:"
Write-Host "  status : $status"
Write-Host "  checks : $($checks.Count)"
Write-Host "  failed : $($failed.Count)"
Write-Host "  report : $mdPath"

if ($failed.Count -gt 0) {
    exit 1
}
