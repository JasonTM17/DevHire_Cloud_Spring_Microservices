[CmdletBinding()]
param(
    [string]$SourceDir = "frontend/test-results/portfolio-screenshots",
    [string]$TargetDir = "docs/screenshots",
    [ValidateSet("Portfolio", "Operations", "Stitch", "All")]
    [string]$Set = "Portfolio",
    [string]$OperationsSourceDir = "frontend/test-results/ops-screenshots",
    [string]$StitchSourceDir = "frontend/test-results/stitch-route-matrix",
    [string]$StitchTargetSubdir = "stitch",
    [string[]]$Names = @(
        "jobs-page.png",
        "job-detail.png",
        "candidate-dashboard.png",
        "assistant-page.png",
        "employer-dashboard.png",
        "admin-dashboard.png"
    ),
    [string[]]$OperationsNames = @(
        "docker-runtime-jobs.png",
        "ops-ai-provider.png",
        "ops-mailpit.png",
        "ops-prometheus-rules.png",
        "ops-grafana-slo.png",
        "ops-openapi-job-service.png"
    ),
    [string[]]$StitchNames = @(
        "client-jobs.png",
        "client-job-detail.png",
        "candidate-dashboard.png",
        "candidate-applications.png",
        "candidate-profile.png",
        "candidate-assessments.png",
        "candidate-offers.png",
        "candidate-interview-prep.png",
        "candidate-roadmap.png",
        "candidate-skill-analytics.png",
        "client-community.png",
        "company-profile.png",
        "employer-pipeline.png",
        "admin-control-plane.png",
        "admin-ai-ops.png",
        "assistant.png",
        "platform-observability.png",
        "platform-cloud.png",
        "platform-releases.png"
    )
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$sourceRoot = if ([System.IO.Path]::IsPathRooted($SourceDir)) {
    [System.IO.Path]::GetFullPath($SourceDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $SourceDir))
}
$targetRoot = if ([System.IO.Path]::IsPathRooted($TargetDir)) {
    [System.IO.Path]::GetFullPath($TargetDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $TargetDir))
}

New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null

$promoted = @()
function Promote-ScreenshotSet {
    param(
        [string]$Root,
        [string[]]$FileNames,
        [string]$Label,
        [string]$TargetSubdir = ""
    )

    if (-not (Test-Path $Root)) {
        throw "Screenshot source directory is missing for $Label evidence: $Root. Run the matching Playwright screenshot capture first."
    }

    foreach ($name in $FileNames) {
        $source = Join-Path $Root $name
        if (-not (Test-Path $source)) {
            throw "Expected $Label screenshot is missing: $source"
        }

        $destinationRoot = if ([string]::IsNullOrWhiteSpace($TargetSubdir)) {
            $targetRoot
        } else {
            Join-Path $targetRoot $TargetSubdir
        }
        New-Item -ItemType Directory -Force -Path $destinationRoot | Out-Null

        $target = Join-Path $destinationRoot $name
        Copy-Item -Path $source -Destination $target -Force
        $script:promoted += [pscustomobject]@{
            set = $Label
            name = $name
            source = $source
            target = $target
        }
    }
}

if ($Set -eq "Portfolio" -or $Set -eq "All") {
    Promote-ScreenshotSet -Root $sourceRoot -FileNames $Names -Label "portfolio"
}

if ($Set -eq "Operations" -or $Set -eq "All") {
    $operationsRoot = if ([System.IO.Path]::IsPathRooted($OperationsSourceDir)) {
        [System.IO.Path]::GetFullPath($OperationsSourceDir)
    } else {
        [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OperationsSourceDir))
    }
    Promote-ScreenshotSet -Root $operationsRoot -FileNames $OperationsNames -Label "operations"
}

if ($Set -eq "Stitch" -or $Set -eq "All") {
    $stitchRoot = if ([System.IO.Path]::IsPathRooted($StitchSourceDir)) {
        [System.IO.Path]::GetFullPath($StitchSourceDir)
    } else {
        [System.IO.Path]::GetFullPath((Join-Path $repoRoot $StitchSourceDir))
    }
    Promote-ScreenshotSet -Root $stitchRoot -FileNames $StitchNames -Label "stitch" -TargetSubdir $StitchTargetSubdir
}

Write-Host "Promoted curated screenshots:"
$promoted | Format-Table -AutoSize | Out-String | Write-Host
