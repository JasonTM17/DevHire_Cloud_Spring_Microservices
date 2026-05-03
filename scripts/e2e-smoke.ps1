[CmdletBinding()]
param(
    [switch]$Build,
    [switch]$SkipCompose,
    [switch]$KeepRunning,
    [string]$FrontendUrl = $env:E2E_FRONTEND_URL,
    [string]$GatewayUrl = $env:E2E_GATEWAY_URL
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$frontendDir = Join-Path $repoRoot "frontend"

function Set-EnvDefault {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Value
    )

    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($Name, "Process"))) {
        [Environment]::SetEnvironmentVariable($Name, $Value, "Process")
    }
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

if ([string]::IsNullOrWhiteSpace($FrontendUrl)) {
    $frontendPort = if ([string]::IsNullOrWhiteSpace($env:FRONTEND_HOST_PORT)) { "3001" } else { $env:FRONTEND_HOST_PORT }
    $FrontendUrl = "http://localhost:$frontendPort"
}
if ([string]::IsNullOrWhiteSpace($GatewayUrl)) {
    $gatewayPort = if ([string]::IsNullOrWhiteSpace($env:GATEWAY_HOST_PORT)) { "8080" } else { $env:GATEWAY_HOST_PORT }
    $GatewayUrl = "http://localhost:$gatewayPort"
}
$env:CORS_ALLOWED_ORIGINS = "$FrontendUrl,http://localhost:3000,http://localhost:3001,http://localhost:13001"

function Wait-HttpOk {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$TimeoutSeconds = 240
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

function Invoke-GatewaySmoke {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [Parameter(Mandatory = $true)][string]$Origin
    )

    $response = Invoke-WebRequest -Uri "$Url/api/jobs?size=1" -UseBasicParsing -TimeoutSec 20 -Headers @{
        Origin = $Origin
    }
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
        throw "Gateway smoke request failed with $($response.StatusCode)"
    }
    if ($response.Headers["Access-Control-Allow-Origin"] -and $response.Headers["Access-Control-Allow-Origin"] -ne $Origin) {
        throw "Gateway CORS header did not echo expected origin $Origin"
    }
}

Push-Location $repoRoot
try {
    $env:NEXT_PUBLIC_API_BASE_URL = $GatewayUrl
    $env:DEVHIRE_NOTIFICATION_EMAIL_ENABLED = "false"
    $env:MANAGEMENT_HEALTH_MAIL_ENABLED = "false"

    if (-not $SkipCompose) {
        $composeArgs = @("compose", "up", "-d")
        if ($Build) {
            $composeArgs += "--build"
        }
        docker @composeArgs
        if ($LASTEXITCODE -ne 0) {
            throw "docker compose up failed"
        }
    }

    Wait-HttpOk -Url "$GatewayUrl/actuator/health/readiness"
    Wait-HttpOk -Url "http://localhost:$env:AUTH_HOST_PORT/actuator/health/readiness"
    Wait-HttpOk -Url "http://localhost:$env:USER_HOST_PORT/actuator/health/readiness"
    Wait-HttpOk -Url "http://localhost:$env:COMPANY_HOST_PORT/actuator/health/readiness"
    Wait-HttpOk -Url "http://localhost:$env:JOB_HOST_PORT/actuator/health/readiness"
    Wait-HttpOk -Url "http://localhost:$env:APPLICATION_HOST_PORT/actuator/health/readiness"
    Wait-HttpOk -Url "http://localhost:$env:NOTIFICATION_HOST_PORT/actuator/health/readiness"
    Wait-HttpOk -Url "http://localhost:$env:AUDIT_HOST_PORT/actuator/health/readiness"
    Invoke-GatewaySmoke -Url $GatewayUrl -Origin $FrontendUrl
    Wait-HttpOk -Url "$FrontendUrl/jobs"

    Push-Location $frontendDir
    try {
        if (-not (Test-Path "node_modules")) {
            npm ci
        }
        npx playwright install chromium
        $env:E2E_FRONTEND_URL = $FrontendUrl
        npm run e2e
        if ($LASTEXITCODE -ne 0) {
            throw "Playwright E2E failed"
        }
        npm run screenshots
        if ($LASTEXITCODE -ne 0) {
            throw "Playwright screenshot capture failed"
        }
    } finally {
        Pop-Location
    }
} finally {
    if (-not $SkipCompose -and -not $KeepRunning) {
        docker compose down
    }
    Pop-Location
}
