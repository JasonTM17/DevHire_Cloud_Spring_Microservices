[CmdletBinding()]
param(
    [string]$GatewayUrl = "http://localhost:8080",
    [string]$MailpitUrl = "http://localhost:8025",
    [string]$ReportDir = "reports/portfolio-runtime-report",
    [switch]$SkipPerf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$reportRoot = if ([System.IO.Path]::IsPathRooted($ReportDir)) {
    [System.IO.Path]::GetFullPath($ReportDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ReportDir))
}
$steps = [System.Collections.Generic.List[object]]::new()
New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null

function Invoke-ReportStep {
    param(
        [string]$Name,
        [string]$Command,
        [scriptblock]$Action
    )

    $started = Get-Date
    Write-Host ""
    Write-Host "==> $Name"
    try {
        & $Action
        $steps.Add([pscustomobject]@{
            name = $Name
            command = $Command
            status = "passed"
            durationSeconds = [Math]::Round(((Get-Date) - $started).TotalSeconds, 2)
        })
        Write-Host "PASS $Name"
    } catch {
        $steps.Add([pscustomobject]@{
            name = $Name
            command = $Command
            status = "failed"
            durationSeconds = [Math]::Round(((Get-Date) - $started).TotalSeconds, 2)
            error = $_.Exception.Message
        })
        throw
    }
}

function Write-Report {
    New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $jsonPath = Join-Path $reportRoot "portfolio-runtime-report-$stamp.json"
    $mdPath = Join-Path $reportRoot "portfolio-runtime-report-$stamp.md"
    $status = if ($steps.Where({ $_.status -eq "failed" }).Count -gt 0) { "failed" } else { "passed" }

    $report = [pscustomobject]@{
        status = $status
        gatewayUrl = $GatewayUrl
        mailpitUrl = $MailpitUrl
        generatedAt = (Get-Date).ToString("o")
        steps = @($steps)
    }
    $report | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# DevHire Runtime Evidence Report")
    $lines.Add("")
    $lines.Add("- Status: $status")
    $lines.Add("- Gateway: $GatewayUrl")
    $lines.Add("- Mailpit: $MailpitUrl")
    $lines.Add("- Generated: $($report.generatedAt)")
    $lines.Add("")
    $lines.Add("| Step | Status | Duration | Command |")
    $lines.Add("|---|---|---:|---|")
    foreach ($step in $steps) {
        $lines.Add("| $($step.name) | $($step.status) | $($step.durationSeconds)s | ``$($step.command.Replace('|', '\|'))`` |")
    }
    $lines | Set-Content -Path $mdPath -Encoding UTF8

    Write-Host ""
    Write-Host "Runtime report written to:"
    Write-Host "  $jsonPath"
    Write-Host "  $mdPath"
}

Push-Location $repoRoot
try {
    Invoke-ReportStep "API smoke" ".\scripts\api-smoke.ps1 -GatewayUrl $GatewayUrl" {
        & "$PSScriptRoot\api-smoke.ps1" -GatewayUrl $GatewayUrl
    }
    Invoke-ReportStep "Runtime reliability" ".\scripts\runtime-reliability.ps1 -GatewayUrl $GatewayUrl" {
        & "$PSScriptRoot\runtime-reliability.ps1" -GatewayUrl $GatewayUrl
    }
    Invoke-ReportStep "Runtime observability" ".\scripts\runtime-observability-smoke.ps1 -GatewayUrl $GatewayUrl -SkipTraffic" {
        & "$PSScriptRoot\runtime-observability-smoke.ps1" -GatewayUrl $GatewayUrl -SkipTraffic
    }
    Invoke-ReportStep "OpenAPI verify" ".\scripts\openapi-verify.ps1 -GatewayUrl $GatewayUrl" {
        & "$PSScriptRoot\openapi-verify.ps1" -GatewayUrl $GatewayUrl
    }
    Invoke-ReportStep "Demo data runtime aggregates" ".\scripts\demo-data-summary.ps1 -FromDocker -Aggregates -Json" {
        & "$PSScriptRoot\demo-data-summary.ps1" -FromDocker -Aggregates -Json | Set-Content -Path (Join-Path $reportRoot "demo-data-summary.json") -Encoding UTF8
    }
    Invoke-ReportStep "Runtime evidence summary" ".\scripts\runtime-evidence-summary.ps1" {
        & "$PSScriptRoot\runtime-evidence-summary.ps1"
    }
    if (-not $SkipPerf) {
        Invoke-ReportStep "Role-based k6 smoke" ".\scripts\perf-suite.ps1 -GatewayUrl $GatewayUrl -Scenario all -Vus 2 -Duration 10s" {
            & "$PSScriptRoot\perf-suite.ps1" -GatewayUrl $GatewayUrl -Scenario all -Vus 2 -Duration "10s"
        }
    }
} finally {
    Pop-Location
    Write-Report
}

if ($steps.Where({ $_.status -eq "failed" }).Count -gt 0) {
    exit 1
}
