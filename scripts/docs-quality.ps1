[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$requiredPaths = @(
    "README.md",
    ".editorconfig",
    ".java-version",
    ".nvmrc",
    "docs/README_EN.md",
    "docs/README_JA.md",
    "LICENSE",
    "docs/REVIEW_EVIDENCE.md",
    "docs/demo-script.md",
    "docs/slo.md",
    "docs/security.md",
    "docs/ai-assistant.md",
    "docs/claude-haiku.md",
    "docs/ai-safety.md",
    "docs/ai-evaluation.md",
    "docs/portfolio-case-study.md",
    "docs/production-readiness.md",
    "docs/professional-review-map.md",
    "docs/service-catalog.md",
    "docs/architecture-review-index.md",
    "docs/github-owner-actions.md",
    "docs/github-governance.md",
    "docs/branch-protection.md",
    "docs/repository-health.md",
    "docs/production-engineering-scorecard.md",
    "docs/repository-structure.md",
    "docs/design-system.md",
    "docs/demo-data.md",
    "docs/data-model-and-seed-strategy.md",
    "docs/versioning.md",
    "docs/dependency-maintenance.md",
    "docs/dependency-triage-v0.4.md",
    "docs/dependabot-cleanup-v0.4.md",
    "docs/api-compatibility.md",
    "docs/evidence-manifest.md",
    "docs/evidence-manifest.json",
    "docs/contracts/api-compatibility-manifest.json",
    "docs/security-evidence.md",
    "docs/cloud-readiness-review.md",
    "docs/runtime-reliability-review.md",
    "docs/runtime-acceptance-matrix.md",
    "docs/runtime-evidence-v0.4.md",
    "docs/observability-evidence.md",
    "docs/repository-hygiene.md",
    "scripts/runtime-preflight.ps1",
    "scripts/github-governance.ps1",
    "scripts/github-facade-assert.ps1",
    "scripts/dependabot-curate.ps1",
    "scripts/dependabot-zero-noise.ps1",
    "scripts/github-workflow-status.ps1",
    "scripts/repository-health.ps1",
    "scripts/public-portfolio-audit.ps1",
    "scripts/portfolio-demo-evidence.ps1",
    "scripts/docs-parity.ps1",
    "scripts/demo-data-summary.ps1",
    "scripts/migration-smoke.ps1",
    "scripts/runtime-observability-smoke.ps1",
    "scripts/portfolio-runtime-report.ps1",
    "frontend/scripts/e2e-preview.mjs",
    "scripts/clean-local-artifacts.ps1",
    "scripts/domain-placeholder-audit.ps1",
    "scripts/professionalism-audit.ps1",
    "scripts/visual-evidence-audit.ps1",
    "scripts/evidence-manifest-verify.ps1",
    "scripts/screenshot-promote.ps1",
    "scripts/cloud-verify.ps1",
    "deploy/terraform/aws/TERRAFORM_DOCS.md",
    "docs/runbooks/alert-response.md",
    "docs/runbooks/kafka-outbox-incident.md",
    "docs/runbooks/opensearch-degradation.md",
    "docs/runbooks/smtp-provider-outage.md",
    "docs/runbooks/ai-provider-outage.md",
    "docs/runbooks/database-restore-drill.md",
    "docs/release-notes/v0.3.0.md",
    "docs/release-evidence/v0.3.0.md",
    "docs/release-notes/v0.4.0.md",
    "docs/release-notes/v0.4.6.md",
    "docs/release-evidence/v0.4.0.md",
    "docs/release-evidence/v0.4.4.md",
    "docs/release-evidence/v0.4.6.md",
    "docs/release-evidence/v0.4.8.md",
    "docs/release-evidence/v0.4.9.md",
    "docs/release-evidence/v0.5.0.md",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    ".github/settings.yml",
    ".github/PULL_REQUEST_TEMPLATE.md",
    ".github/workflows/repository-governance.yml",
    ".github/workflows/dependabot-curation.yml"
)

Push-Location $repoRoot
try {
    foreach ($path in $requiredPaths) {
        if (-not (Test-Path $path)) {
            throw "Required portfolio document is missing: $path"
        }
    }

    $markdownFiles = @(
        Get-Item README.md
        Get-ChildItem docs -Recurse -Filter *.md | Where-Object { $_.Name -ne "PROGRESS.md" }
        Get-Item SECURITY.md
        Get-Item CONTRIBUTING.md
        Get-Item CHANGELOG.md
    )

    $mojibakeMarkers = @(
        [string][char]0x00C3,
        [string][char]0x00C2,
        ([string][char]0x00E2 + [string][char]0x20AC),
        [string][char]0x00E6
    )

    foreach ($file in $markdownFiles) {
        $content = Get-Content -Raw -Encoding UTF8 $file.FullName
        if ($content.Contains([char]0xFFFD)) {
            throw "Replacement character detected in $($file.FullName)"
        }
        foreach ($marker in $mojibakeMarkers) {
            if ($content.Contains($marker)) {
                throw "Potential mojibake marker detected in $($file.FullName)"
            }
        }
        if ($content -match "(?i)\b(TODO|FIXME)\b") {
            throw "Unsafe placeholder marker detected in $($file.FullName)"
        }
        if ($content -match "sk-[A-Za-z0-9_-]{20,}") {
            throw "Potential API key pattern detected in $($file.FullName)"
        }
    }

    $demo = Get-Content -Raw -Encoding UTF8 "docs/demo-script.md"
    foreach ($expected in @("/assistant", "Claude", "AI_TOOL_EXECUTED", "scripts/reset-demo-data.ps1")) {
        if ($demo -notmatch [regex]::Escape($expected)) {
            throw "Demo script is missing expected AI portfolio content: $expected"
        }
    }

    Write-Host "Documentation quality checks passed."
} finally {
    Pop-Location
}
