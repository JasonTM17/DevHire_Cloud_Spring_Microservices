[CmdletBinding()]
param(
    [string]$ReportDir = "reports/v1-cloud-evidence"
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

function Invoke-CloudStep {
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

function Write-CloudReport {
    New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null
    $finishedAt = Get-Date
    $status = if ($steps.Where({ $_.status -eq "failed" }).Count -gt 0) { "failed" } else { "passed" }
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $jsonPath = Join-Path $reportRoot "v1-cloud-evidence-$stamp.json"
    $mdPath = Join-Path $reportRoot "v1-cloud-evidence-$stamp.md"

    $report = [pscustomobject]@{
        status = $status
        startedAt = $startedAt.ToString("o")
        finishedAt = $finishedAt.ToString("o")
        durationSeconds = [Math]::Round(($finishedAt - $startedAt).TotalSeconds, 2)
        note = "No AWS credentials or terraform apply are required for this blueprint evidence gate."
        steps = @($steps)
    }
    $report | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# DevHire Cloud v1 Cloud Evidence Report")
    $lines.Add("")
    $lines.Add("- Status: $status")
    $lines.Add("- Note: no AWS credentials or terraform apply are required")
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
    Write-Host "v1 cloud evidence reports:"
    Write-Host "  $jsonPath"
    Write-Host "  $mdPath"
}

Push-Location $repoRoot
try {
    Invoke-CloudStep "terraform validate" ".\scripts\terraform-validate.ps1" {
        & "$PSScriptRoot\terraform-validate.ps1"
    }
    Invoke-CloudStep "terraform race smoke" ".\scripts\terraform-race-smoke.ps1" {
        & "$PSScriptRoot\terraform-race-smoke.ps1"
    }
    Invoke-CloudStep "cloud render verification" ".\scripts\cloud-verify.ps1" {
        & "$PSScriptRoot\cloud-verify.ps1"
    }
    Invoke-CloudStep "cloud policy audit" ".\scripts\cloud-policy-audit.ps1" {
        & "$PSScriptRoot\cloud-policy-audit.ps1"
    }
    Invoke-CloudStep "cloud evidence summary" ".\scripts\cloud-evidence-summary.ps1" {
        & "$PSScriptRoot\cloud-evidence-summary.ps1"
    }
} finally {
    Write-CloudReport
    Pop-Location
}
