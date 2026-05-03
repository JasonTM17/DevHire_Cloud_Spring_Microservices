[CmdletBinding()]
param(
    [switch]$All,
    [switch]$Backend,
    [switch]$Frontend,
    [switch]$Docker,
    [switch]$Smoke,
    [switch]$Infra,
    [switch]$Security,
    [switch]$Docs,
    [switch]$StartStack,
    [switch]$SkipPerf,
    [switch]$SkipChaos,
    [switch]$SkipTerraform,
    [string]$GatewayUrl = "http://localhost:8080",
    [string]$MailpitUrl = "http://localhost:8025",
    [int]$PerfVus = 2,
    [string]$PerfDuration = "10s",
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$MavenOpts = "-Xmx768m -XX:MaxMetaspaceSize=384m -XX:ReservedCodeCacheSize=96m",
    [string]$ReportDir = "reports/verification"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$startedAt = Get-Date
$reportRoot = Join-Path $repoRoot $ReportDir
$summary = [System.Collections.Generic.List[object]]::new()

function Enable-DefaultScope {
    if (-not ($All -or $Backend -or $Frontend -or $Docker -or $Smoke -or $Infra -or $Security -or $Docs)) {
        $script:Backend = $true
        $script:Docs = $true
    }
    if ($All) {
        $script:Backend = $true
        $script:Frontend = $true
        $script:Docker = $true
        $script:Smoke = $true
        $script:Infra = $true
        $script:Security = $true
        $script:Docs = $true
    }
}

function Invoke-VerificationStep {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][scriptblock]$Action
    )

    $stepStarted = Get-Date
    Write-Host ""
    Write-Host "==> $Name"
    try {
        & $Action
        $duration = [Math]::Round(((Get-Date) - $stepStarted).TotalSeconds, 2)
        $summary.Add([pscustomobject]@{
            name = $Name
            status = "passed"
            durationSeconds = $duration
        })
        Write-Host "PASS $Name ($duration s)"
    } catch {
        $duration = [Math]::Round(((Get-Date) - $stepStarted).TotalSeconds, 2)
        $summary.Add([pscustomobject]@{
            name = $Name
            status = "failed"
            durationSeconds = $duration
            error = $_.Exception.Message
        })
        throw
    }
}

function Assert-LastExitCode {
    param([Parameter(Mandatory = $true)][string]$CommandName)
    if ($LASTEXITCODE -ne 0) {
        throw "$CommandName failed with exit code $LASTEXITCODE"
    }
}

function Invoke-HelmVerification {
    docker run --rm -v "${repoRoot}:/workspace" -w /workspace alpine/helm:3.16.4 lint deploy/helm/devhire-cloud
    Assert-LastExitCode "helm lint"

    foreach ($values in @("values-local.yaml", "values-staging.yaml", "values-prod.yaml", "values-aws-staging.yaml", "values-aws-prod.yaml")) {
        docker run --rm -v "${repoRoot}:/workspace" -w /workspace alpine/helm:3.16.4 template devhire-cloud deploy/helm/devhire-cloud -f "deploy/helm/devhire-cloud/$values" > $null
        Assert-LastExitCode "helm template $values"
    }
}

function Invoke-PromtoolVerification {
    docker run --rm --entrypoint promtool -v "${repoRoot}/infra/prometheus:/etc/prometheus" prom/prometheus:v3.0.1 check config /etc/prometheus/prometheus.yml
    Assert-LastExitCode "promtool"
}

Enable-DefaultScope
New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null

Push-Location $repoRoot
try {
    if ($Docs) {
        Invoke-VerificationStep "docs quality" {
            & "$PSScriptRoot\docs-quality.ps1"
        }
        Invoke-VerificationStep "git diff whitespace check" {
            git diff --check
            Assert-LastExitCode "git diff --check"
        }
    }

    if ($Backend) {
        Invoke-VerificationStep "maven clean verify" {
            if ([string]::IsNullOrWhiteSpace($JavaHome)) {
                throw "JAVA_HOME is not set. Install JDK 21+ and set JAVA_HOME before running backend verification."
            }
            $env:JAVA_HOME = $JavaHome
            $env:Path = "$env:JAVA_HOME\bin;$env:Path"
            $env:MAVEN_OPTS = $MavenOpts
            mvn -T1 clean verify
            Assert-LastExitCode "mvn clean verify"
        }
        Invoke-VerificationStep "coverage gate" {
            & "$PSScriptRoot\check-coverage.ps1" -Root $repoRoot
        }
    }

    if ($Frontend) {
        Invoke-VerificationStep "frontend npm ci" {
            Push-Location (Join-Path $repoRoot "frontend")
            try {
                npm ci
                Assert-LastExitCode "npm ci"
            } finally {
                Pop-Location
            }
        }
        Invoke-VerificationStep "frontend typecheck build e2e" {
            Push-Location (Join-Path $repoRoot "frontend")
            try {
                npm run typecheck
                Assert-LastExitCode "npm run typecheck"
                npm run build
                Assert-LastExitCode "npm run build"
                npm run e2e
                Assert-LastExitCode "npm run e2e"
            } finally {
                Pop-Location
            }
        }
    }

    if ($Docker) {
        Invoke-VerificationStep "docker compose config" {
            docker compose config --quiet
            Assert-LastExitCode "docker compose config"
        }
        if ($StartStack) {
            Invoke-VerificationStep "docker compose up" {
                docker compose up -d --build
                Assert-LastExitCode "docker compose up"
            }
        }
    }

    if ($Smoke) {
        if ($StartStack -and -not $Docker) {
            Invoke-VerificationStep "docker compose up" {
                docker compose up -d --build
                Assert-LastExitCode "docker compose up"
            }
        }
        Invoke-VerificationStep "api smoke" {
            & "$PSScriptRoot\api-smoke.ps1" -GatewayUrl $GatewayUrl
        }
        Invoke-VerificationStep "ai eval" {
            & "$PSScriptRoot\ai-eval.ps1" -GatewayUrl $GatewayUrl
        }
        Invoke-VerificationStep "email smoke" {
            & "$PSScriptRoot\email-smoke.ps1" -GatewayUrl $GatewayUrl -MailpitUrl $MailpitUrl
        }
        Invoke-VerificationStep "openapi conformance" {
            & "$PSScriptRoot\openapi-verify.ps1" -GatewayUrl $GatewayUrl
        }
        if (-not $SkipPerf) {
            Invoke-VerificationStep "role based k6 smoke" {
                & "$PSScriptRoot\perf-suite.ps1" -GatewayUrl $GatewayUrl -Scenario all -Vus $PerfVus -Duration $PerfDuration -UseDocker
            }
        }
        if (-not $SkipChaos) {
            Invoke-VerificationStep "chaos smoke" {
                & "$PSScriptRoot\chaos-smoke.ps1" -GatewayUrl $GatewayUrl -Scenario all -Recover
            }
        }
        Invoke-VerificationStep "dr verify" {
            & "$PSScriptRoot\dr-verify.ps1" -GatewayUrl $GatewayUrl
        }
    }

    if ($Infra) {
        if (-not $SkipTerraform) {
            Invoke-VerificationStep "terraform validate" {
                & "$PSScriptRoot\terraform-validate.ps1"
            }
        }
        Invoke-VerificationStep "helm lint and template" {
            Invoke-HelmVerification
        }
        Invoke-VerificationStep "prometheus config and rules" {
            Invoke-PromtoolVerification
        }
    }

    if ($Security) {
        Invoke-VerificationStep "actionlint" {
            docker run --rm -v "${repoRoot}:/repo" -w /repo rhysd/actionlint:latest
            Assert-LastExitCode "actionlint"
        }
        Invoke-VerificationStep "gitleaks" {
            docker run --rm -v "${repoRoot}:/repo" -w /repo zricethezav/gitleaks:latest detect --source /repo --no-git --redact --verbose
            Assert-LastExitCode "gitleaks"
        }
    }
} finally {
    Pop-Location

    $finishedAt = Get-Date
    $status = if ($summary.Where({ $_.status -eq "failed" }).Count -gt 0) { "failed" } else { "passed" }
    $report = [pscustomobject]@{
        status = $status
        startedAt = $startedAt.ToString("o")
        finishedAt = $finishedAt.ToString("o")
        durationSeconds = [Math]::Round(($finishedAt - $startedAt).TotalSeconds, 2)
        scopes = [pscustomobject]@{
            backend = [bool]$Backend
            frontend = [bool]$Frontend
            docker = [bool]$Docker
            smoke = [bool]$Smoke
            infra = [bool]$Infra
            security = [bool]$Security
            docs = [bool]$Docs
        }
        steps = @($summary)
    }

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $jsonPath = Join-Path $reportRoot "verification-$stamp.json"
    $mdPath = Join-Path $reportRoot "verification-$stamp.md"
    $report | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# DevHire Verification Report")
    $lines.Add("")
    $lines.Add("- Status: $status")
    $lines.Add("- Started: $($report.startedAt)")
    $lines.Add("- Finished: $($report.finishedAt)")
    $lines.Add("- Duration: $($report.durationSeconds)s")
    $lines.Add("")
    $lines.Add("| Step | Status | Duration |")
    $lines.Add("|---|---|---:|")
    foreach ($step in $summary) {
        $lines.Add("| $($step.name) | $($step.status) | $($step.durationSeconds)s |")
    }
    $lines | Set-Content -Path $mdPath -Encoding UTF8

    Write-Host ""
    Write-Host "Verification report:"
    Write-Host "  $jsonPath"
    Write-Host "  $mdPath"
}

if ($summary.Where({ $_.status -eq "failed" }).Count -gt 0) {
    exit 1
}
