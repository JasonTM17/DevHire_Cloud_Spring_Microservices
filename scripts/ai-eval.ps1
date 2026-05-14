[CmdletBinding()]
param(
    [switch]$StartStack,
    [switch]$Build,
    [switch]$KeepRunning,
    [string]$GatewayUrl = $env:E2E_GATEWAY_URL,
    [string]$EvalFile = "docs/ai/eval-prompts.json",
    [string]$OutputPath = "reports/ai/eval-summary.json",
    [int]$HealthTimeoutSeconds = 360
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

$explicitGatewayHostPort = -not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable("GATEWAY_HOST_PORT", "Process"))
$explicitAiHostPort = -not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable("AI_HOST_PORT", "Process"))

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

function Write-ComposeFailureDiagnostics {
    Write-Warning "docker compose up failed; collecting container state and recent bootstrap logs."
    try {
        docker compose ps
    } catch {
        Write-Warning "Unable to collect docker compose ps: $($_.Exception.Message)"
    }
    foreach ($service in @("postgres-init", "postgres", "api-gateway", "application-service", "ai-service")) {
        try {
            Write-Warning "Recent logs for ${service}:"
            docker compose logs --no-color --tail=160 $service
        } catch {
            Write-Warning "Unable to collect logs for ${service}: $($_.Exception.Message)"
        }
    }
}

function Invoke-Api {
    param(
        [Parameter(Mandatory = $true)][ValidateSet("GET", "POST")][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [string]$Token,
        $Body = $null
    )

    $headers = @{}
    if (-not [string]::IsNullOrWhiteSpace($Token)) {
        $headers.Authorization = "Bearer $Token"
    }

    $params = @{
        Method     = $Method
        Uri        = "$GatewayUrl$Path"
        Headers    = $headers
        TimeoutSec = 45
    }
    if ($null -ne $Body) {
        $params.ContentType = "application/json"
        $params.Body = ($Body | ConvertTo-Json -Depth 12)
    }

    $response = Invoke-RestMethod @params
    if ($response.PSObject.Properties.Name -contains "data") {
        return $response.data
    }
    return $response
}

function Login {
    param(
        [Parameter(Mandatory = $true)][string]$Email,
        [Parameter(Mandatory = $true)][string]$Password
    )

    $response = Invoke-Api -Method POST -Path "/api/auth/login" -Body @{
        email    = $Email
        password = $Password
    }
    if ([string]::IsNullOrWhiteSpace($response.accessToken)) {
        throw "Login for $Email did not return an access token"
    }
    return $response.accessToken
}

function Assert-ContainsTerms {
    param(
        [Parameter(Mandatory = $true)][string]$Answer,
        [Parameter(Mandatory = $true)]$Terms,
        [Parameter(Mandatory = $true)][string]$PromptId
    )

    foreach ($term in $Terms) {
        if ($Answer -notmatch [regex]::Escape([string]$term)) {
            throw "AI eval '$PromptId' did not include expected term '$term'"
        }
    }
}

$portDefaults = if ($StartStack) {
    @{
        POSTGRES_HOST_PORT = "55432"; REDIS_HOST_PORT = "56379"; KAFKA_HOST_PORT = "39092";
        GATEWAY_HOST_PORT = "18080"; FRONTEND_HOST_PORT = "13001"; AUTH_HOST_PORT = "18081";
        USER_HOST_PORT = "18082"; COMPANY_HOST_PORT = "18083"; JOB_HOST_PORT = "18084";
        APPLICATION_HOST_PORT = "18085"; NOTIFICATION_HOST_PORT = "18086"; AUDIT_HOST_PORT = "18087";
        AI_HOST_PORT = "18088"; PROMETHEUS_HOST_PORT = "19090"; GRAFANA_HOST_PORT = "13000";
        LOKI_HOST_PORT = "13100"; TEMPO_HOST_PORT = "13200"; TEMPO_GRPC_HOST_PORT = "14317";
        OTEL_HTTP_HOST_PORT = "14318"; OTEL_METRICS_HOST_PORT = "18889"; OPENSEARCH_HOST_PORT = "19200";
        OPENSEARCH_TRANSPORT_HOST_PORT = "19600"; OPENSEARCH_DASHBOARDS_HOST_PORT = "15601"
    }
} else {
    @{
        GATEWAY_HOST_PORT = "8080"; AI_HOST_PORT = "8088"
    }
}

foreach ($entry in $portDefaults.GetEnumerator()) {
    Set-EnvDefault -Name $entry.Key -Value $entry.Value
}

if ([string]::IsNullOrWhiteSpace($GatewayUrl)) {
    $GatewayUrl = "http://localhost:$env:GATEWAY_HOST_PORT"
} else {
    $gatewayUri = $null
    if ([System.Uri]::TryCreate($GatewayUrl, [System.UriKind]::Absolute, [ref]$gatewayUri) `
        -and $gatewayUri.Host -in @("localhost", "127.0.0.1", "::1") `
        -and $gatewayUri.Port -gt 0) {
        if (-not $explicitGatewayHostPort) {
            [Environment]::SetEnvironmentVariable("GATEWAY_HOST_PORT", [string]$gatewayUri.Port, "Process")
        }
        if (-not $explicitAiHostPort) {
            [Environment]::SetEnvironmentVariable("AI_HOST_PORT", [string]($gatewayUri.Port + 8), "Process")
        }
    }
}

Push-Location $repoRoot
try {
    $env:DEVHIRE_NOTIFICATION_EMAIL_ENABLED = "false"
    $env:MANAGEMENT_HEALTH_MAIL_ENABLED = "false"
    $env:DEVHIRE_AI_DEMO_FALLBACK_ENABLED = "true"

    if ($StartStack) {
        $composeArgs = @("compose", "up", "-d")
        if ($Build) {
            $composeArgs += "--build"
        }
        docker @composeArgs
        if ($LASTEXITCODE -ne 0) {
            Write-ComposeFailureDiagnostics
            throw "docker compose up failed"
        }
    }

    Wait-HttpOk -Url "$GatewayUrl/actuator/health/readiness" -TimeoutSeconds $HealthTimeoutSeconds
    Wait-HttpOk -Url "http://localhost:$env:AI_HOST_PORT/actuator/health/readiness" -TimeoutSeconds $HealthTimeoutSeconds

    $candidateToken = Login -Email "candidate@devhire.local" -Password "Candidate@123456"
    $adminToken = Login -Email "admin@devhire.local" -Password "Admin@123456"
    $provider = Invoke-Api -Method GET -Path "/api/admin/ai/provider/status" -Token $adminToken
    if ($provider.provider -ne "anthropic" -or [string]::IsNullOrWhiteSpace($provider.model)) {
        throw "AI provider diagnostics did not return the expected Anthropic model metadata"
    }
    if ($provider.circuitBreakerState -notin @("OPEN", "CLOSED")) {
        throw "AI provider diagnostics did not include a valid circuit breaker state"
    }
    $evals = Get-Content -Raw -Encoding UTF8 $EvalFile | ConvertFrom-Json

    $results = foreach ($eval in $evals) {
        $response = Invoke-Api -Method POST -Path "/api/ai/chat" -Token $candidateToken -Body @{
            message = $eval.prompt
        }
        if ([string]::IsNullOrWhiteSpace($response.answer)) {
            throw "AI eval '$($eval.id)' returned an empty answer"
        }
        Assert-ContainsTerms -Answer $response.answer -Terms $eval.expectedTerms -PromptId $eval.id
        if ($eval.requiresCitation -and ($null -eq $response.citations -or $response.citations.Count -lt 1)) {
            throw "AI eval '$($eval.id)' did not include citations"
        }
        if ($eval.requiresToolTrace -and ($null -eq $response.toolTraces -or $response.toolTraces.Count -lt 1)) {
            throw "AI eval '$($eval.id)' did not include tool traces"
        }
        [pscustomobject]@{
            id            = $eval.id
            fallback      = [bool]$response.fallback
            citationCount = $response.citations.Count
            toolCount     = $response.toolTraces.Count
            answerChars   = $response.answer.Length
            model         = $response.model
        }
    }

    $summary = [pscustomobject]@{
        gateway    = $GatewayUrl
        provider   = $provider
        evaluatedAt = (Get-Date).ToUniversalTime().ToString("o")
        total      = @($results).Count
        results    = @($results)
    }

    $resolvedOutput = Join-Path $repoRoot $OutputPath
    New-Item -ItemType Directory -Force -Path (Split-Path $resolvedOutput -Parent) | Out-Null
    $summary | ConvertTo-Json -Depth 12 | Set-Content -Encoding UTF8 $resolvedOutput
    $summary | ConvertTo-Json -Depth 12
} finally {
    if ($StartStack -and -not $KeepRunning) {
        docker compose down
    }
    Pop-Location
}
