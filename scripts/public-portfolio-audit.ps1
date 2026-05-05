[CmdletBinding()]
param(
    [switch]$RunE2E,
    [string]$OutputDir = "reports/public-portfolio-audit"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputRoot = if ([System.IO.Path]::IsPathRooted($OutputDir)) {
    [System.IO.Path]::GetFullPath($OutputDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OutputDir))
}
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$steps = [System.Collections.Generic.List[object]]::new()

function Add-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][scriptblock]$Action
    )

    $started = Get-Date
    try {
        & $Action
        $steps.Add([pscustomobject]@{
            name = $Name
            command = $Command
            status = "passed"
            durationSeconds = [Math]::Round(((Get-Date) - $started).TotalSeconds, 2)
        })
    } catch {
        $steps.Add([pscustomobject]@{
            name = $Name
            command = $Command
            status = "failed"
            durationSeconds = [Math]::Round(((Get-Date) - $started).TotalSeconds, 2)
            error = $_.Exception.Message
        })
    }
}

function Assert-LastExitCode {
    param([Parameter(Mandatory = $true)][string]$CommandName)

    if ($LASTEXITCODE -ne 0) {
        throw "$CommandName failed with exit code $LASTEXITCODE"
    }
}

Push-Location $repoRoot
try {
    Add-Step "GitHub facade public assertion" ".\scripts\github-facade-assert.ps1 -AllowOwnerActions" {
        & "$PSScriptRoot\github-facade-assert.ps1" -AllowOwnerActions
    }
    Add-Step "Repository health public scan" ".\scripts\repository-health.ps1" {
        & "$PSScriptRoot\repository-health.ps1"
    }
    Add-Step "Dependabot curation dry-run" ".\scripts\dependabot-curate.ps1 -DryRun" {
        & "$PSScriptRoot\dependabot-curate.ps1" -DryRun
    }
    Add-Step "Screenshot manifest verification" ".\scripts\evidence-manifest-verify.ps1" {
        & "$PSScriptRoot\evidence-manifest-verify.ps1"
    }
    Add-Step "Docs quality" ".\scripts\docs-quality.ps1" {
        & "$PSScriptRoot\docs-quality.ps1"
    }

    if ($RunE2E) {
        Add-Step "Self-starting E2E preview" "cd frontend; npm run e2e:all" {
            Push-Location (Join-Path $repoRoot "frontend")
            try {
                npm run e2e:all
                Assert-LastExitCode "npm run e2e:all"
            } finally {
                Pop-Location
            }
        }
    } else {
        $steps.Add([pscustomobject]@{
            name = "Self-starting E2E preview"
            command = "cd frontend; npm run e2e:all"
            status = "not_run"
            durationSeconds = 0
            note = "Use -RunE2E to include the heavier browser smoke in this audit."
        })
    }
} finally {
    Pop-Location
}

$failed = @($steps | Where-Object { $_.status -eq "failed" })
$status = if ($failed.Count -eq 0) { "passed" } else { "failed" }
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $outputRoot "public-portfolio-audit-$stamp.json"
$mdPath = Join-Path $outputRoot "public-portfolio-audit-$stamp.md"

$summary = [ordered]@{
    status = $status
    generatedAt = (Get-Date).ToString("o")
    runE2E = [bool]$RunE2E
    repository = "JasonTM17/DevHire_Cloud_Spring_Microservices"
    steps = @($steps)
}
$summary | ConvertTo-Json -Depth 10 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# Public Portfolio Audit")
$lines.Add("")
$lines.Add("- Status: $status")
$lines.Add("- Generated: $($summary.generatedAt)")
$lines.Add("- Run E2E: $($summary.runE2E)")
$lines.Add("")
$lines.Add("| Evidence | Status | Command |")
$lines.Add("|---|---|---|")
foreach ($step in $steps) {
    $safeCommand = $step.command.Replace("|", "\|")
    $lines.Add("| $($step.name) | $($step.status) | `$safeCommand` |")
}
$lines.Add("")
$lines.Add("## Interpretation")
$lines.Add("")
$lines.Add("- `owner_action_required` inside GitHub facade reports is expected until an owner runs the Repository Governance workflow with `REPO_GOVERNANCE_TOKEN`.")
$lines.Add("- Dependabot dry-run evidence should show safe batches retained and deferred major updates ready to close through the manual curation workflow.")
$lines.Add("- Raw generated reports stay under `reports/` and are intentionally ignored.")
$lines | Set-Content -Path $mdPath -Encoding UTF8

Write-Host "Public portfolio audit: $status"
Write-Host "Reports:"
Write-Host "  $jsonPath"
Write-Host "  $mdPath"

if ($failed.Count -gt 0) {
    throw "Public portfolio audit failed: $($failed.name -join ', ')"
}
