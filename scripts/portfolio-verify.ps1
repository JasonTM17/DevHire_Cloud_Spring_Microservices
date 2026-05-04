[CmdletBinding()]
param(
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$Docker,
    [switch]$Runtime,
    [switch]$Security,
    [switch]$Docs,
    [switch]$All,
    [switch]$StartStack,
    [string]$GatewayUrl = "http://localhost:8080",
    [string]$MailpitUrl = "http://localhost:8025",
    [int]$PerfVus = 2,
    [string]$PerfDuration = "10s",
    [string]$ReportDir = "reports/portfolio-verify"
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
$scopedEnvNames = @(
    "POSTGRES_HOST_PORT",
    "REDIS_HOST_PORT",
    "KAFKA_HOST_PORT",
    "GATEWAY_HOST_PORT",
    "FRONTEND_HOST_PORT",
    "AUTH_HOST_PORT",
    "USER_HOST_PORT",
    "COMPANY_HOST_PORT",
    "JOB_HOST_PORT",
    "APPLICATION_HOST_PORT",
    "NOTIFICATION_HOST_PORT",
    "AUDIT_HOST_PORT",
    "AI_HOST_PORT",
    "PROMETHEUS_HOST_PORT",
    "GRAFANA_HOST_PORT",
    "LOKI_HOST_PORT",
    "TEMPO_HOST_PORT",
    "TEMPO_GRPC_HOST_PORT",
    "OTEL_HTTP_HOST_PORT",
    "OTEL_METRICS_HOST_PORT",
    "OPENSEARCH_HOST_PORT",
    "OPENSEARCH_TRANSPORT_HOST_PORT",
    "OPENSEARCH_DASHBOARDS_HOST_PORT",
    "DEVHIRE_NOTIFICATION_EMAIL_ENABLED",
    "MANAGEMENT_HEALTH_MAIL_ENABLED",
    "DEVHIRE_AI_DEMO_FALLBACK_ENABLED"
)

function Enable-DefaultScopes {
    if (-not ($Backend -or $Frontend -or $Docker -or $Runtime -or $Security -or $Docs -or $All)) {
        $script:Docs = $true
        $script:Docker = $true
    }

    if ($All) {
        $script:Backend = $true
        $script:Frontend = $true
        $script:Docker = $true
        $script:Runtime = $true
        $script:Security = $true
        $script:Docs = $true
    }
}

function Assert-LastExitCode {
    param([Parameter(Mandatory = $true)][string]$CommandName)

    if ($LASTEXITCODE -ne 0) {
        throw "$CommandName failed with exit code $LASTEXITCODE"
    }
}

function Invoke-PortfolioStep {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][scriptblock]$Action
    )

    $stepStarted = Get-Date
    $envSnapshot = @{}
    foreach ($envName in $script:scopedEnvNames) {
        $envSnapshot[$envName] = [Environment]::GetEnvironmentVariable($envName, "Process")
    }

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
    } finally {
        foreach ($envName in $script:scopedEnvNames) {
            [Environment]::SetEnvironmentVariable($envName, $envSnapshot[$envName], "Process")
        }
    }
}

function Wait-GatewayReadiness {
    $deadline = (Get-Date).AddMinutes(3)
    do {
        try {
            $response = Invoke-WebRequest -Uri "$GatewayUrl/actuator/health/readiness" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return
            }
        } catch {
            Start-Sleep -Seconds 3
        }
    } while ((Get-Date) -lt $deadline)

    throw "Timed out waiting for Gateway readiness at $GatewayUrl"
}

function Write-PortfolioReport {
    New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null
    $finishedAt = Get-Date
    $status = if ($steps.Where({ $_.status -eq "failed" }).Count -gt 0) { "failed" } else { "passed" }
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $jsonPath = Join-Path $reportRoot "portfolio-verify-$stamp.json"
    $mdPath = Join-Path $reportRoot "portfolio-verify-$stamp.md"

    $report = [pscustomobject]@{
        status = $status
        startedAt = $startedAt.ToString("o")
        finishedAt = $finishedAt.ToString("o")
        durationSeconds = [Math]::Round(($finishedAt - $startedAt).TotalSeconds, 2)
        gatewayUrl = $GatewayUrl
        mailpitUrl = $MailpitUrl
        scopes = [pscustomobject]@{
            backend = [bool]$Backend
            frontend = [bool]$Frontend
            docker = [bool]$Docker
            runtime = [bool]$Runtime
            security = [bool]$Security
            docs = [bool]$Docs
        }
        steps = @($steps)
    }
    $report | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# DevHire Portfolio Verification Report")
    $lines.Add("")
    $lines.Add("- Status: $status")
    $lines.Add("- Gateway: $GatewayUrl")
    $lines.Add("- Started: $($report.startedAt)")
    $lines.Add("- Finished: $($report.finishedAt)")
    $lines.Add("- Duration: $($report.durationSeconds)s")
    $lines.Add("")
    $lines.Add("| Step | Status | Duration | Command |")
    $lines.Add("|---|---|---:|---|")
    foreach ($step in $steps) {
        $safeCommand = $step.command.Replace("|", "\|")
        $lines.Add("| $($step.name) | $($step.status) | $($step.durationSeconds)s | `$safeCommand` |")
    }
    $lines | Set-Content -Path $mdPath -Encoding UTF8

    Write-Host ""
    Write-Host "Portfolio verification report:"
    Write-Host "  $jsonPath"
    Write-Host "  $mdPath"
}

Enable-DefaultScopes
New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null

Push-Location $repoRoot
try {
    if ($Docs) {
        Invoke-PortfolioStep "docs quality" ".\scripts\docs-quality.ps1" {
            & "$PSScriptRoot\docs-quality.ps1"
        }
        Invoke-PortfolioStep "version consistency" ".\scripts\version-consistency.ps1" {
            & "$PSScriptRoot\version-consistency.ps1"
        }
        Invoke-PortfolioStep "api compatibility manifest" ".\scripts\api-compatibility.ps1 -ManifestOnly" {
            & "$PSScriptRoot\api-compatibility.ps1" -ManifestOnly
        }
        Invoke-PortfolioStep "evidence audit" ".\scripts\evidence-audit.ps1" {
            & "$PSScriptRoot\evidence-audit.ps1"
        }
        Invoke-PortfolioStep "repository hygiene" ".\scripts\repo-hygiene.ps1" {
            & "$PSScriptRoot\repo-hygiene.ps1"
        }
        Invoke-PortfolioStep "git diff whitespace" "git diff --check" {
            git diff --check
            Assert-LastExitCode "git diff --check"
        }
    }

    if ($Backend) {
        Invoke-PortfolioStep "backend maven verify" "mvn -T1 clean verify" {
            mvn -T1 clean verify
            Assert-LastExitCode "mvn clean verify"
        }
        Invoke-PortfolioStep "coverage gate" ".\scripts\check-coverage.ps1" {
            & "$PSScriptRoot\check-coverage.ps1"
        }
    }

    if ($Frontend) {
        Invoke-PortfolioStep "frontend typecheck" "cd frontend; npm run typecheck" {
            Push-Location (Join-Path $repoRoot "frontend")
            try {
                npm run typecheck
                Assert-LastExitCode "npm run typecheck"
            } finally {
                Pop-Location
            }
        }
        Invoke-PortfolioStep "frontend production build" "cd frontend; npm run build" {
            Push-Location (Join-Path $repoRoot "frontend")
            try {
                npm run build
                Assert-LastExitCode "npm run build"
            } finally {
                Pop-Location
            }
        }
    }

    if ($Docker) {
        Invoke-PortfolioStep "docker compose config" "docker compose config --quiet" {
            docker compose config --quiet
            Assert-LastExitCode "docker compose config"
        }
        if ($StartStack) {
            Invoke-PortfolioStep "runtime preflight" ".\scripts\runtime-preflight.ps1" {
                & "$PSScriptRoot\runtime-preflight.ps1"
            }
            Invoke-PortfolioStep "docker compose up" "docker compose up -d --build" {
                docker compose up -d --build
                Assert-LastExitCode "docker compose up"
            }
        }
    }

    if ($Runtime) {
        if ($StartStack -and -not $Docker) {
            Invoke-PortfolioStep "runtime preflight" ".\scripts\runtime-preflight.ps1" {
                & "$PSScriptRoot\runtime-preflight.ps1"
            }
            Invoke-PortfolioStep "docker compose up" "docker compose up -d --build" {
                docker compose up -d --build
                Assert-LastExitCode "docker compose up"
            }
        }
        Invoke-PortfolioStep "gateway readiness" "$GatewayUrl/actuator/health/readiness" {
            Wait-GatewayReadiness
        }
        Invoke-PortfolioStep "api smoke" ".\scripts\api-smoke.ps1 -GatewayUrl $GatewayUrl" {
            & "$PSScriptRoot\api-smoke.ps1" -GatewayUrl $GatewayUrl
        }
        Invoke-PortfolioStep "runtime reliability acceptance" ".\scripts\runtime-reliability.ps1 -GatewayUrl $GatewayUrl" {
            & "$PSScriptRoot\runtime-reliability.ps1" -GatewayUrl $GatewayUrl
        }
        Invoke-PortfolioStep "ai eval" ".\scripts\ai-eval.ps1 -GatewayUrl $GatewayUrl" {
            & "$PSScriptRoot\ai-eval.ps1" -GatewayUrl $GatewayUrl
        }
        Invoke-PortfolioStep "email smoke" ".\scripts\email-smoke.ps1 -GatewayUrl $GatewayUrl -MailpitUrl $MailpitUrl" {
            & "$PSScriptRoot\email-smoke.ps1" -GatewayUrl $GatewayUrl -MailpitUrl $MailpitUrl
        }
        Invoke-PortfolioStep "openapi verify" ".\scripts\openapi-verify.ps1 -GatewayUrl $GatewayUrl" {
            & "$PSScriptRoot\openapi-verify.ps1" -GatewayUrl $GatewayUrl
        }
        Invoke-PortfolioStep "role based perf smoke" ".\scripts\perf-suite.ps1 -GatewayUrl $GatewayUrl -Scenario all -Vus $PerfVus -Duration $PerfDuration" {
            & "$PSScriptRoot\perf-suite.ps1" -GatewayUrl $GatewayUrl -Scenario all -Vus $PerfVus -Duration $PerfDuration
        }
    }

    if ($Security) {
        Invoke-PortfolioStep "actionlint" "docker run --rm -v `${PWD}:/repo -w /repo rhysd/actionlint:latest" {
            docker run --rm -v "${repoRoot}:/repo" -w /repo rhysd/actionlint:latest
            Assert-LastExitCode "actionlint"
        }
        Invoke-PortfolioStep "gitleaks" "docker run --rm -v `${PWD}:/repo -w /repo zricethezav/gitleaks:latest detect --source /repo --no-git --redact --verbose" {
            docker run --rm -v "${repoRoot}:/repo" -w /repo zricethezav/gitleaks:latest detect --source /repo --no-git --redact --verbose
            Assert-LastExitCode "gitleaks"
        }
    }
} finally {
    Pop-Location
    Write-PortfolioReport
}

if ($steps.Where({ $_.status -eq "failed" }).Count -gt 0) {
    exit 1
}
