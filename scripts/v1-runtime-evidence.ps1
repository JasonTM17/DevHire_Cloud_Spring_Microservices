[CmdletBinding()]
param(
    [string]$GatewayUrl = "http://localhost:8080",
    [switch]$IncludePerf,
    [switch]$CaptureScreenshots,
    [switch]$PromoteScreenshots,
    [string]$ReportDir = "reports/v1-runtime-evidence"
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

function Invoke-RuntimeStep {
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

function Write-RuntimeReport {
    New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null
    $finishedAt = Get-Date
    $status = if ($steps.Where({ $_.status -eq "failed" }).Count -gt 0) { "failed" } else { "passed" }
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $jsonPath = Join-Path $reportRoot "v1-runtime-evidence-$stamp.json"
    $mdPath = Join-Path $reportRoot "v1-runtime-evidence-$stamp.md"

    $report = [pscustomobject]@{
        status = $status
        gatewayUrl = $GatewayUrl
        startedAt = $startedAt.ToString("o")
        finishedAt = $finishedAt.ToString("o")
        durationSeconds = [Math]::Round(($finishedAt - $startedAt).TotalSeconds, 2)
        includes = [pscustomobject]@{
            perf = [bool]$IncludePerf
            captureScreenshots = [bool]$CaptureScreenshots
            promoteScreenshots = [bool]$PromoteScreenshots
        }
        steps = @($steps)
    }
    $report | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# DevHire Cloud v1 Runtime Evidence Report")
    $lines.Add("")
    $lines.Add("- Status: $status")
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
    Write-Host "v1 runtime evidence reports:"
    Write-Host "  $jsonPath"
    Write-Host "  $mdPath"
}

Push-Location $repoRoot
try {
    Invoke-RuntimeStep "runtime preflight" ".\scripts\runtime-preflight.ps1" {
        & "$PSScriptRoot\runtime-preflight.ps1"
    }
    Invoke-RuntimeStep "portfolio runtime verification" ".\scripts\portfolio-verify.ps1 -Runtime -GatewayUrl $GatewayUrl" {
        & "$PSScriptRoot\portfolio-verify.ps1" -Runtime -GatewayUrl $GatewayUrl
    }
    Invoke-RuntimeStep "runtime observability smoke" ".\scripts\runtime-observability-smoke.ps1 -GatewayUrl $GatewayUrl" {
        & "$PSScriptRoot\runtime-observability-smoke.ps1" -GatewayUrl $GatewayUrl
    }
    Invoke-RuntimeStep "runtime reliability smoke" ".\scripts\runtime-reliability.ps1 -GatewayUrl $GatewayUrl" {
        & "$PSScriptRoot\runtime-reliability.ps1" -GatewayUrl $GatewayUrl
    }
    Invoke-RuntimeStep "openapi runtime verification" ".\scripts\openapi-verify.ps1 -GatewayUrl $GatewayUrl" {
        & "$PSScriptRoot\openapi-verify.ps1" -GatewayUrl $GatewayUrl
    }
    Invoke-RuntimeStep "runtime data aggregates" ".\scripts\demo-data-summary.ps1 -FromDocker -Aggregates" {
        & "$PSScriptRoot\demo-data-summary.ps1" -FromDocker -Aggregates
    }

    if ($IncludePerf) {
        Invoke-RuntimeStep "role-based performance smoke" ".\scripts\perf-suite.ps1 -GatewayUrl $GatewayUrl -Scenario all -Vus 2 -Duration 10s" {
            & "$PSScriptRoot\perf-suite.ps1" -GatewayUrl $GatewayUrl -Scenario all -Vus 2 -Duration "10s"
        }
    }

    $demoArgs = @("-GatewayUrl", $GatewayUrl)
    if ($CaptureScreenshots) {
        $demoArgs += "-CaptureScreenshots"
    }
    if ($PromoteScreenshots) {
        $demoArgs += "-PromoteScreenshots"
    }
    Invoke-RuntimeStep "portfolio runtime report" ".\scripts\portfolio-runtime-report.ps1 -GatewayUrl $GatewayUrl" {
        & "$PSScriptRoot\portfolio-runtime-report.ps1" -GatewayUrl $GatewayUrl
    }
    if ($CaptureScreenshots -or $PromoteScreenshots) {
        Invoke-RuntimeStep "curated portfolio evidence" ".\scripts\portfolio-demo-evidence.ps1 $($demoArgs -join ' ')" {
            & "$PSScriptRoot\portfolio-demo-evidence.ps1" @demoArgs
        }
        Invoke-RuntimeStep "visual evidence audit" ".\scripts\visual-evidence-audit.ps1" {
            & "$PSScriptRoot\visual-evidence-audit.ps1"
        }
    }
} finally {
    Write-RuntimeReport
    Pop-Location
}
