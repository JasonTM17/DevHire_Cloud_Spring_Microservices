[CmdletBinding()]
param(
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$Runtime,
    [switch]$Cloud,
    [switch]$Security,
    [switch]$All,
    [switch]$RequireGreen,
    [string]$Branch = "master",
    [string]$GatewayUrl = "http://localhost:8080",
    [string]$ReportDir = "reports/v1-release-verify"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$reportRoot = if ([System.IO.Path]::IsPathRooted($ReportDir)) {
    [System.IO.Path]::GetFullPath($ReportDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ReportDir))
}

if (-not ($Backend -or $Frontend -or $Runtime -or $Cloud -or $Security -or $All)) {
    $Cloud = $true
}
if ($All) {
    $Backend = $true
    $Frontend = $true
    $Runtime = $true
    $Cloud = $true
    $Security = $true
}

$startedAt = Get-Date
$steps = [System.Collections.Generic.List[object]]::new()

function Invoke-V1Step {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][scriptblock]$Action
    )

    $stepStarted = Get-Date
    Write-Host ""
    Write-Host "==> $Name"
    try {
        $global:LASTEXITCODE = 0
        & $Action
        if ($LASTEXITCODE -ne 0) {
            throw "$Command failed with exit code $LASTEXITCODE"
        }
        $duration = [Math]::Round(((Get-Date) - $stepStarted).TotalSeconds, 2)
        $steps.Add([pscustomobject]@{
            name = $Name
            command = $Command
            status = "passed"
            durationSeconds = $duration
        })
        Write-Host "PASS $Name ($duration s)"
    } catch {
        $duration = [Math]::Round(((Get-Date) - $stepStarted).TotalSeconds, 2)
        $steps.Add([pscustomobject]@{
            name = $Name
            command = $Command
            status = "failed"
            durationSeconds = $duration
            error = $_.Exception.Message
        })
        throw
    }
}

function Write-V1Report {
    New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null
    $finishedAt = Get-Date
    $status = if ($steps.Where({ $_.status -eq "failed" }).Count -gt 0) { "failed" } else { "passed" }
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $jsonPath = Join-Path $reportRoot "v1-release-verify-$stamp.json"
    $mdPath = Join-Path $reportRoot "v1-release-verify-$stamp.md"

    $report = [pscustomobject]@{
        status = $status
        branch = $Branch
        gatewayUrl = $GatewayUrl
        startedAt = $startedAt.ToString("o")
        finishedAt = $finishedAt.ToString("o")
        durationSeconds = [Math]::Round(($finishedAt - $startedAt).TotalSeconds, 2)
        scopes = [pscustomobject]@{
            backend = [bool]$Backend
            frontend = [bool]$Frontend
            runtime = [bool]$Runtime
            cloud = [bool]$Cloud
            security = [bool]$Security
            requireGreen = [bool]$RequireGreen
        }
        steps = @($steps)
    }
    $report | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# DevHire Cloud v1 Release Verification Report")
    $lines.Add("")
    $lines.Add("- Status: $status")
    $lines.Add("- Branch: $Branch")
    $lines.Add("- Gateway: $GatewayUrl")
    $lines.Add("- Started: $($report.startedAt)")
    $lines.Add("- Finished: $($report.finishedAt)")
    $lines.Add("")
    $lines.Add("| Step | Status | Duration | Command |")
    $lines.Add("|---|---|---:|---|")
    foreach ($step in $steps) {
        $safeCommand = $step.command.Replace("|", "\|")
        $lines.Add("| $($step.name) | $($step.status) | $($step.durationSeconds)s | ``$safeCommand`` |")
    }
    $lines | Set-Content -Path $mdPath -Encoding UTF8

    Write-Host ""
    Write-Host "v1 release verification reports:"
    Write-Host "  $jsonPath"
    Write-Host "  $mdPath"
}

Push-Location $repoRoot
try {
    Invoke-V1Step "documentation quality" ".\scripts\docs-quality.ps1" {
        & "$PSScriptRoot\docs-quality.ps1"
    }
    Invoke-V1Step "trilingual documentation parity" ".\scripts\docs-parity.ps1" {
        & "$PSScriptRoot\docs-parity.ps1"
    }
    Invoke-V1Step "evidence manifest" ".\scripts\evidence-manifest-verify.ps1" {
        & "$PSScriptRoot\evidence-manifest-verify.ps1"
    }
    Invoke-V1Step "repository hygiene" ".\scripts\repo-hygiene.ps1" {
        & "$PSScriptRoot\repo-hygiene.ps1"
    }
    Invoke-V1Step "portfolio static gate" ".\scripts\portfolio-verify.ps1 -Docs -Docker -Cloud" {
        & "$PSScriptRoot\portfolio-verify.ps1" -Docs -Docker -Cloud
    }

    if ($Backend) {
        Invoke-V1Step "backend verify" "mvn -T1 clean verify" {
            mvn -T1 clean verify
        }
        Invoke-V1Step "coverage gate" ".\scripts\check-coverage.ps1" {
            & "$PSScriptRoot\check-coverage.ps1"
        }
        Invoke-V1Step "migration smoke" ".\scripts\migration-smoke.ps1" {
            & "$PSScriptRoot\migration-smoke.ps1"
        }
    }

    if ($Frontend) {
        Invoke-V1Step "frontend typecheck" "cd frontend; npm run typecheck" {
            Push-Location (Join-Path $repoRoot "frontend")
            try {
                npm run typecheck
            } finally {
                Pop-Location
            }
        }
        Invoke-V1Step "frontend build" "cd frontend; npm run build" {
            Push-Location (Join-Path $repoRoot "frontend")
            try {
                npm run build
            } finally {
                Pop-Location
            }
        }
        Invoke-V1Step "frontend e2e" "cd frontend; npm run e2e:all" {
            Push-Location (Join-Path $repoRoot "frontend")
            try {
                npm run e2e:all
            } finally {
                Pop-Location
            }
        }
    }

    if ($Cloud) {
        Invoke-V1Step "v1 cloud evidence" ".\scripts\v1-cloud-evidence.ps1" {
            & "$PSScriptRoot\v1-cloud-evidence.ps1"
        }
    }

    if ($Runtime) {
        Invoke-V1Step "v1 runtime evidence" ".\scripts\v1-runtime-evidence.ps1 -GatewayUrl $GatewayUrl" {
            & "$PSScriptRoot\v1-runtime-evidence.ps1" -GatewayUrl $GatewayUrl
        }
    }

    if ($Security) {
        Invoke-V1Step "professionalism audit" ".\scripts\professionalism-audit.ps1" {
            & "$PSScriptRoot\professionalism-audit.ps1"
        }
        Invoke-V1Step "public portfolio audit" ".\scripts\public-portfolio-audit.ps1" {
            & "$PSScriptRoot\public-portfolio-audit.ps1"
        }
    }

    if ($RequireGreen) {
        Invoke-V1Step "github workflow status" ".\scripts\github-workflow-status.ps1 -Branch $Branch -RequireGreen" {
            & "$PSScriptRoot\github-workflow-status.ps1" -Branch $Branch -RequireGreen
        }
    }
} finally {
    Write-V1Report
    Pop-Location
}
