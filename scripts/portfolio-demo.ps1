[CmdletBinding()]
param(
    [switch]$Build,
    [switch]$RunE2E,
    [switch]$ResetBefore,
    [switch]$StopAfter,
    [string]$GatewayUrl = $env:E2E_GATEWAY_URL,
    [string]$FrontendUrl = $env:E2E_FRONTEND_URL
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Set-EnvDefault {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Value
    )

    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name, "Process"))) {
        [Environment]::SetEnvironmentVariable($Name, $Value, "Process")
    }
}

function Wait-HttpOk {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$TimeoutSeconds = 360
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return
            }
        } catch {
            Start-Sleep -Seconds 5
        }
    } while ((Get-Date) -lt $deadline)

    throw "Timed out waiting for $Url"
}

Set-EnvDefault -Name "POSTGRES_HOST_PORT" -Value "55432"
Set-EnvDefault -Name "REDIS_HOST_PORT" -Value "56379"
Set-EnvDefault -Name "KAFKA_HOST_PORT" -Value "39092"
Set-EnvDefault -Name "GATEWAY_HOST_PORT" -Value "18080"
Set-EnvDefault -Name "FRONTEND_HOST_PORT" -Value "13001"
Set-EnvDefault -Name "AUTH_HOST_PORT" -Value "18081"
Set-EnvDefault -Name "USER_HOST_PORT" -Value "18082"
Set-EnvDefault -Name "COMPANY_HOST_PORT" -Value "18083"
Set-EnvDefault -Name "JOB_HOST_PORT" -Value "18084"
Set-EnvDefault -Name "APPLICATION_HOST_PORT" -Value "18085"
Set-EnvDefault -Name "NOTIFICATION_HOST_PORT" -Value "18086"
Set-EnvDefault -Name "AUDIT_HOST_PORT" -Value "18087"
Set-EnvDefault -Name "AI_HOST_PORT" -Value "18088"
Set-EnvDefault -Name "PROMETHEUS_HOST_PORT" -Value "19090"
Set-EnvDefault -Name "GRAFANA_HOST_PORT" -Value "13000"
Set-EnvDefault -Name "LOKI_HOST_PORT" -Value "13100"
Set-EnvDefault -Name "TEMPO_HOST_PORT" -Value "13200"
Set-EnvDefault -Name "TEMPO_GRPC_HOST_PORT" -Value "14317"
Set-EnvDefault -Name "OTEL_HTTP_HOST_PORT" -Value "14318"
Set-EnvDefault -Name "OTEL_METRICS_HOST_PORT" -Value "18889"
Set-EnvDefault -Name "OPENSEARCH_HOST_PORT" -Value "19200"
Set-EnvDefault -Name "OPENSEARCH_TRANSPORT_HOST_PORT" -Value "19600"
Set-EnvDefault -Name "OPENSEARCH_DASHBOARDS_HOST_PORT" -Value "15601"

if ([string]::IsNullOrWhiteSpace($GatewayUrl)) {
    $GatewayUrl = "http://localhost:$env:GATEWAY_HOST_PORT"
}
if ([string]::IsNullOrWhiteSpace($FrontendUrl)) {
    $FrontendUrl = "http://localhost:$env:FRONTEND_HOST_PORT"
}

$env:CORS_ALLOWED_ORIGINS = "$FrontendUrl,http://localhost:3000,http://localhost:3001,http://localhost:13001"
$env:DEVHIRE_NOTIFICATION_EMAIL_ENABLED = "false"
$env:MANAGEMENT_HEALTH_MAIL_ENABLED = "false"
$env:DEVHIRE_AI_DEMO_FALLBACK_ENABLED = "true"

Push-Location $repoRoot
try {
    $composeArgs = @("compose", "up", "-d")
    if ($Build) {
        $composeArgs += "--build"
    }

    Write-Host "Starting DevHire Cloud portfolio stack..."
    docker @composeArgs
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose up failed"
    }

    Wait-HttpOk -Url "$GatewayUrl/actuator/health/readiness"
    Wait-HttpOk -Url "http://localhost:$env:AI_HOST_PORT/actuator/health/readiness"
    Wait-HttpOk -Url "$FrontendUrl/jobs"

    if ($ResetBefore) {
        & "$PSScriptRoot/reset-demo-data.ps1"
    }

    Write-Host "Running Gateway business smoke..."
    & "$PSScriptRoot/api-smoke.ps1" -GatewayUrl $GatewayUrl -HealthTimeoutSeconds 360

    if ($RunE2E) {
        Write-Host "Running browser E2E smoke and screenshots..."
        & "$PSScriptRoot/e2e-smoke.ps1" -SkipCompose -FrontendUrl $FrontendUrl -GatewayUrl $GatewayUrl
    }

    [pscustomobject]@{
        frontend          = $FrontendUrl
        assistant         = "$FrontendUrl/assistant"
        gateway           = $GatewayUrl
        grafana           = "http://localhost:$env:GRAFANA_HOST_PORT"
        prometheus        = "http://localhost:$env:PROMETHEUS_HOST_PORT"
        opensearch        = "http://localhost:$env:OPENSEARCH_HOST_PORT"
        opensearchDash    = "http://localhost:$env:OPENSEARCH_DASHBOARDS_HOST_PORT"
        demoAdmin         = "admin@devhire.local / Admin@123456"
        demoEmployer      = "employer@devhire.local / Employer@123456"
        demoCandidate     = "candidate@devhire.local / Candidate@123456"
        claudeFallback    = "enabled unless ANTHROPIC_API_KEY is provided through environment/secrets"
        nextDemoDocument  = "docs/demo-script.md"
    } | ConvertTo-Json -Depth 4
} finally {
    if ($StopAfter) {
        Write-Host "Stopping stack because -StopAfter was provided."
        docker compose down
    }
    Pop-Location
}
