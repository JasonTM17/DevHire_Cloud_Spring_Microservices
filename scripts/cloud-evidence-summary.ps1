[CmdletBinding()]
param(
    [string]$CloudVerifyReportDir = "reports/cloud-verify",
    [string]$PolicyAuditReportDir = "reports/cloud-policy-audit",
    [string]$OutputDir = "reports/cloud-evidence-summary"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Resolve-ReportDir {
    param([Parameter(Mandatory = $true)][string]$Path)
    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }
    return [System.IO.Path]::GetFullPath((Join-Path $repoRoot $Path))
}

function Get-LatestJsonReport {
    param(
        [Parameter(Mandatory = $true)][string]$Directory,
        [Parameter(Mandatory = $true)][string]$Pattern
    )

    if (-not (Test-Path -LiteralPath $Directory)) {
        return $null
    }

    $file = Get-ChildItem -Path $Directory -Filter $Pattern -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1

    if (-not $file) {
        return $null
    }

    return [pscustomobject]@{
        path = $file.FullName
        data = Get-Content -Raw -Path $file.FullName | ConvertFrom-Json
    }
}

$cloudDir = Resolve-ReportDir $CloudVerifyReportDir
$policyDir = Resolve-ReportDir $PolicyAuditReportDir
$outputRoot = Resolve-ReportDir $OutputDir

$cloud = Get-LatestJsonReport -Directory $cloudDir -Pattern "cloud-verify-*.json"
$policy = Get-LatestJsonReport -Directory $policyDir -Pattern "cloud-policy-audit-*.json"

if (-not $cloud) {
    throw "No cloud verification report found under $cloudDir. Run .\scripts\cloud-verify.ps1 first."
}

if (-not $policy) {
    throw "No cloud policy audit report found under $policyDir. Run .\scripts\cloud-policy-audit.ps1 first."
}

$status = if ($cloud.data.status -eq "passed" -and $policy.data.status -eq "passed") { "passed" } else { "failed" }

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $outputRoot "cloud-evidence-summary-$stamp.json"
$mdPath = Join-Path $outputRoot "cloud-evidence-summary-$stamp.md"

$summary = [pscustomobject]@{
    status = $status
    generatedAt = (Get-Date).ToString("o")
    terraformApply = "not run"
    awsCredentialsRequired = $false
    cloudVerifyReport = $cloud.path.Substring($repoRoot.Length + 1).Replace("\", "/")
    policyAuditReport = $policy.path.Substring($repoRoot.Length + 1).Replace("\", "/")
    cloudVerifyStatus = $cloud.data.status
    policyAuditStatus = $policy.data.status
    cloudVerifySteps = @($cloud.data.steps | Select-Object name, status, durationSeconds)
    policyChecks = @($policy.data.checks | Select-Object name, status)
}
$summary | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# Cloud Evidence Summary")
$lines.Add("")
$lines.Add("- Status: $status")
$lines.Add("- Terraform apply: not run")
$lines.Add("- AWS credentials required: false")
$lines.Add("- Cloud verify report: ``$($summary.cloudVerifyReport)``")
$lines.Add("- Policy audit report: ``$($summary.policyAuditReport)``")
$lines.Add("")
$lines.Add("## Cloud Verification Steps")
$lines.Add("")
$lines.Add("| Step | Status | Duration |")
$lines.Add("|---|---|---:|")
foreach ($step in $summary.cloudVerifySteps) {
    $lines.Add("| $($step.name) | $($step.status) | $($step.durationSeconds)s |")
}
$lines.Add("")
$lines.Add("## Policy Checks")
$lines.Add("")
$lines.Add("| Check | Status |")
$lines.Add("|---|---|")
foreach ($check in $summary.policyChecks) {
    $lines.Add("| $($check.name) | $($check.status) |")
}
$lines | Set-Content -Path $mdPath -Encoding UTF8

Write-Host "Cloud evidence summary:"
Write-Host "  status : $status"
Write-Host "  report : $mdPath"

if ($status -ne "passed") {
    exit 1
}
