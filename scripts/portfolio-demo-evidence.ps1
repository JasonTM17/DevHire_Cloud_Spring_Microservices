[CmdletBinding()]
param(
    [string]$GatewayUrl = "http://localhost:8080",
    [string]$MailpitUrl = "http://localhost:8025",
    [string]$ReportDir = "reports/portfolio-demo-evidence",
    [switch]$StartStack,
    [switch]$CaptureScreenshots,
    [switch]$PromoteScreenshots,
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

$startedAt = Get-Date
$steps = [System.Collections.Generic.List[object]]::new()

function Assert-LastExitCode {
    param([Parameter(Mandatory = $true)][string]$CommandName)

    if ($LASTEXITCODE -ne 0) {
        throw "$CommandName failed with exit code $LASTEXITCODE"
    }
}

function Invoke-DemoStep {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][scriptblock]$Action
    )

    $stepStarted = Get-Date
    Write-Host ""
    Write-Host "==> $Name"
    try {
        & $Action
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

function Assert-GatewayAvailable {
    try {
        $response = Invoke-WebRequest -Uri "$GatewayUrl/actuator/health/readiness" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
            return
        }
    } catch {
        throw "Gateway is not reachable at $GatewayUrl. Re-run with -StartStack, or start Docker Compose before collecting runtime evidence."
    }

    throw "Gateway readiness did not return an acceptable status at $GatewayUrl."
}

function Write-DemoReport {
    New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null
    $finishedAt = Get-Date
    $status = if ($steps.Where({ $_.status -eq "failed" }).Count -gt 0) { "failed" } else { "passed" }
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $jsonPath = Join-Path $reportRoot "portfolio-demo-evidence-$stamp.json"
    $mdPath = Join-Path $reportRoot "portfolio-demo-evidence-$stamp.md"

    $report = [pscustomobject]@{
        status = $status
        startedAt = $startedAt.ToString("o")
        finishedAt = $finishedAt.ToString("o")
        durationSeconds = [Math]::Round(($finishedAt - $startedAt).TotalSeconds, 2)
        gatewayUrl = $GatewayUrl
        mailpitUrl = $MailpitUrl
        startStack = [bool]$StartStack
        captureScreenshots = [bool]$CaptureScreenshots
        promoteScreenshots = [bool]$PromoteScreenshots
        skipPerf = [bool]$SkipPerf
        steps = @($steps)
    }
    $report | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# DevHire Portfolio Demo Evidence")
    $lines.Add("")
    $lines.Add("- Status: $status")
    $lines.Add("- Gateway: $GatewayUrl")
    $lines.Add("- Mailpit: $MailpitUrl")
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
    Write-Host "Portfolio demo evidence report:"
    Write-Host "  $jsonPath"
    Write-Host "  $mdPath"
}

New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null

Push-Location $repoRoot
try {
    Invoke-DemoStep "runtime preflight" ".\scripts\runtime-preflight.ps1" {
        & "$PSScriptRoot\runtime-preflight.ps1"
    }

    if ($StartStack) {
        Invoke-DemoStep "docker compose up" "docker compose up -d --build" {
            docker compose up -d --build
            Assert-LastExitCode "docker compose up"
        }
    } else {
        Invoke-DemoStep "docker compose config" "docker compose config --quiet" {
            docker compose config --quiet
            Assert-LastExitCode "docker compose config"
        }
        Invoke-DemoStep "gateway availability" "$GatewayUrl/actuator/health/readiness" {
            Assert-GatewayAvailable
        }
    }

    Invoke-DemoStep "runtime portfolio verification" ".\scripts\portfolio-verify.ps1 -Runtime -GatewayUrl $GatewayUrl" {
        & "$PSScriptRoot\portfolio-verify.ps1" -Runtime -GatewayUrl $GatewayUrl -MailpitUrl $MailpitUrl
    }

    Invoke-DemoStep "runtime evidence summary" ".\scripts\runtime-evidence-summary.ps1" {
        & "$PSScriptRoot\runtime-evidence-summary.ps1"
    }

    if (-not $SkipPerf) {
        Invoke-DemoStep "role based perf smoke" ".\scripts\perf-suite.ps1 -GatewayUrl $GatewayUrl -Scenario all -Vus 2 -Duration 10s" {
            & "$PSScriptRoot\perf-suite.ps1" -GatewayUrl $GatewayUrl -Scenario all -Vus 2 -Duration "10s"
        }
    }

    if ($CaptureScreenshots) {
        Invoke-DemoStep "portfolio screenshots" "cd frontend; npm run screenshots" {
            Push-Location (Join-Path $repoRoot "frontend")
            try {
                npm run screenshots
                Assert-LastExitCode "npm run screenshots"
            } finally {
                Pop-Location
            }
        }
    }

    if ($PromoteScreenshots) {
        Invoke-DemoStep "promote curated screenshots" ".\scripts\screenshot-promote.ps1" {
            & "$PSScriptRoot\screenshot-promote.ps1"
        }
    }

    Invoke-DemoStep "visual evidence audit" ".\scripts\visual-evidence-audit.ps1" {
        & "$PSScriptRoot\visual-evidence-audit.ps1"
    }
} finally {
    Pop-Location
    Write-DemoReport
}

if ($steps.Where({ $_.status -eq "failed" }).Count -gt 0) {
    exit 1
}
