[CmdletBinding()]
param(
    [switch]$FromDocker,
    [string]$ReportDir = "reports/v1-demo-data-verify"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$reportRoot = if ([System.IO.Path]::IsPathRooted($ReportDir)) {
    [System.IO.Path]::GetFullPath($ReportDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ReportDir))
}

$startedAt = Get-Date
$steps = [System.Collections.Generic.List[object]]::new()

function Invoke-DataStep {
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

function Write-DataReport {
    New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null
    $finishedAt = Get-Date
    $status = if ($steps.Where({ $_.status -eq "failed" }).Count -gt 0) { "failed" } else { "passed" }
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $jsonPath = Join-Path $reportRoot "v1-demo-data-verify-$stamp.json"
    $mdPath = Join-Path $reportRoot "v1-demo-data-verify-$stamp.md"

    $report = [pscustomobject]@{
        status = $status
        fromDocker = [bool]$FromDocker
        startedAt = $startedAt.ToString("o")
        finishedAt = $finishedAt.ToString("o")
        durationSeconds = [Math]::Round(($finishedAt - $startedAt).TotalSeconds, 2)
        steps = @($steps)
    }
    $report | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# DevHire Cloud v1 Demo Data Verification Report")
    $lines.Add("")
    $lines.Add("- Status: $status")
    $lines.Add("- Runtime database mode: $([bool]$FromDocker)")
    $lines.Add("")
    $lines.Add("| Step | Status | Duration | Command |")
    $lines.Add("|---|---|---:|---|")
    foreach ($step in $steps) {
        $safeCommand = $step.command.Replace("|", "\|")
        $lines.Add("| $($step.name) | $($step.status) | $($step.durationSeconds)s | ``$safeCommand`` |")
    }
    $lines | Set-Content -Path $mdPath -Encoding UTF8

    Write-Host ""
    Write-Host "v1 demo data verification reports:"
    Write-Host "  $jsonPath"
    Write-Host "  $mdPath"
}

Push-Location $repoRoot
try {
    Invoke-DataStep "migration smoke" ".\scripts\migration-smoke.ps1" {
        & "$PSScriptRoot\migration-smoke.ps1"
    }
    Invoke-DataStep "static demo data summary" ".\scripts\demo-data-summary.ps1" {
        & "$PSScriptRoot\demo-data-summary.ps1"
    }
    if ($FromDocker) {
        Invoke-DataStep "runtime demo data aggregates" ".\scripts\demo-data-summary.ps1 -FromDocker -Aggregates" {
            & "$PSScriptRoot\demo-data-summary.ps1" -FromDocker -Aggregates
        }
    }
} finally {
    Write-DataReport
    Pop-Location
}
