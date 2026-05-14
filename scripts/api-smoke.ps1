[CmdletBinding()]
param(
    [switch]$StartStack,
    [switch]$Build,
    [switch]$KeepRunning,
    [string]$GatewayUrl = $env:E2E_GATEWAY_URL,
    [int]$HealthTimeoutSeconds = 300
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
        [int]$TimeoutSeconds = 300
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
    foreach ($service in @("postgres-init", "postgres", "api-gateway", "application-service", "job-service")) {
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
        [Parameter(Mandatory = $true)][ValidateSet("GET", "POST", "PUT", "PATCH", "DELETE")][string]$Method,
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
        TimeoutSec = 30
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

function Assert-Equals {
    param(
        [Parameter(Mandatory = $true)]$Actual,
        [Parameter(Mandatory = $true)]$Expected,
        [Parameter(Mandatory = $true)][string]$Message
    )

    if ($Actual -ne $Expected) {
        throw "$Message. Expected=$Expected Actual=$Actual"
    }
}

function Wait-SearchContainsJob {
    param(
        [Parameter(Mandatory = $true)][string]$Token,
        [Parameter(Mandatory = $true)][string]$JobId,
        [Parameter(Mandatory = $true)][string]$Keyword,
        [int]$TimeoutSeconds = 45
    )

    $encodedKeyword = [uri]::EscapeDataString($Keyword)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $search = Invoke-Api -Method GET -Path "/api/jobs?keyword=$encodedKeyword&size=20&sort=publishedAt,desc" -Token $Token
        $searchJson = $search | ConvertTo-Json -Depth 12
        if ($searchJson -match [regex]::Escape($JobId)) {
            return
        }
        Start-Sleep -Seconds 3
    } while ((Get-Date) -lt $deadline)

    throw "Published job $JobId was not returned by search within ${TimeoutSeconds}s"
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

Push-Location $repoRoot
try {
    $env:DEVHIRE_NOTIFICATION_EMAIL_ENABLED = "false"
    $env:MANAGEMENT_HEALTH_MAIL_ENABLED = "false"

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

    $adminToken = Login -Email "admin@devhire.local" -Password "Admin@123456"
    $employerToken = Login -Email "employer@devhire.local" -Password "Employer@123456"
    $candidateToken = Login -Email "candidate@devhire.local" -Password "Candidate@123456"

    $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $company = Invoke-Api -Method POST -Path "/api/companies" -Token $employerToken -Body @{
        name        = "DevHire API Verification $stamp"
        logoUrl     = "https://cdn.devhire.local/logos/api-verification.png"
        website     = "https://devhire.local"
        size        = "51-200"
        industry    = "Software"
        description = "Company created by automated Gateway release verification."
    }
    if ([string]::IsNullOrWhiteSpace($company.id)) {
        throw "Company creation did not return an id"
    }

    $approvedCompany = Invoke-Api -Method PATCH -Path "/api/admin/companies/$($company.id)/approve" -Token $adminToken -Body @{
        reason = "Automated Gateway release verification"
    }
    Assert-Equals -Actual $approvedCompany.status -Expected "APPROVED" -Message "Company approval failed"

    $job = Invoke-Api -Method POST -Path "/api/jobs" -Token $employerToken -Body @{
        companyId    = $company.id
        title        = "Senior Java Backend Engineer Verification $stamp"
        description  = "Build production Spring Boot services for a recruitment platform."
        requirements = "Java 21, Spring Boot, PostgreSQL, Kafka, Docker"
        benefits     = "Hybrid work, learning budget, engineering culture"
        salaryMin    = 3500
        salaryMax    = 6500
        location     = "Ho Chi Minh City"
        level        = "Senior"
        type         = "FULL_TIME"
        skills       = @("Java", "Spring Boot", "Kafka", "PostgreSQL")
    }
    if ([string]::IsNullOrWhiteSpace($job.id)) {
        throw "Job creation did not return an id"
    }

    $submittedJob = Invoke-Api -Method PATCH -Path "/api/jobs/$($job.id)/submit-review" -Token $employerToken
    Assert-Equals -Actual $submittedJob.status -Expected "PENDING_REVIEW" -Message "Job review submission failed"

    $approvedJob = Invoke-Api -Method PATCH -Path "/api/admin/jobs/$($job.id)/approve" -Token $adminToken
    Assert-Equals -Actual $approvedJob.status -Expected "PUBLISHED" -Message "Job approval failed"

    Wait-SearchContainsJob -Token $candidateToken -JobId $job.id -Keyword "Verification $stamp"

    $application = Invoke-Api -Method POST -Path "/api/jobs/$($job.id)/applications" -Token $candidateToken -Body @{
        cvUrl       = "https://cdn.devhire.local/cv/final-verification.pdf"
        coverLetter = "Automated final verification application for DevHire Cloud."
    }
    if ([string]::IsNullOrWhiteSpace($application.id)) {
        throw "Application submission did not return an id"
    }

    $updatedApplication = Invoke-Api -Method PATCH -Path "/api/applications/$($application.id)/status" -Token $employerToken -Body @{
        status = "INTERVIEW"
        note   = "Automated Gateway release verification status update"
    }
    Assert-Equals -Actual $updatedApplication.status -Expected "INTERVIEW" -Message "Application status update failed"

    Start-Sleep -Seconds 5
    $notifications = Invoke-Api -Method GET -Path "/api/notifications?page=0&size=10" -Token $candidateToken
    $notificationJson = $notifications | ConvertTo-Json -Depth 12
    if ($notificationJson -notmatch "INTERVIEW" -and $notificationJson -notmatch "Application") {
        throw "Candidate notifications did not contain the expected application signal"
    }

    $audit = Invoke-Api -Method GET -Path "/api/admin/audit-logs?page=0&size=20" -Token $adminToken
    $auditJson = $audit | ConvertTo-Json -Depth 12
    if ($auditJson -notmatch "LOGIN" -and $auditJson -notmatch "login") {
        throw "Audit logs did not return login activity"
    }

    $provider = Invoke-Api -Method GET -Path "/api/admin/ai/provider/status" -Token $adminToken
    if ($provider.provider -ne "anthropic") {
        throw "AI provider diagnostics did not return the expected provider"
    }
    if ([string]::IsNullOrWhiteSpace($provider.model)) {
        throw "AI provider diagnostics did not return a model"
    }
    if ($provider.circuitBreakerState -notin @("OPEN", "CLOSED")) {
        throw "AI provider diagnostics did not return a circuit breaker state"
    }

    $assistant = Invoke-Api -Method POST -Path "/api/ai/chat" -Token $candidateToken -Body @{
        message = "Explain this microservices platform to a recruiter"
    }
    if ([string]::IsNullOrWhiteSpace($assistant.answer)) {
        throw "AI assistant did not return an answer"
    }
    if ($assistant.answer -notmatch "DevHire" -and $assistant.answer -notmatch "microservices") {
        throw "AI assistant answer did not contain expected portfolio context"
    }

    [pscustomobject]@{
        gateway           = $GatewayUrl
        companyId         = $company.id
        jobId             = $job.id
        applicationId     = $application.id
        companyStatus     = $approvedCompany.status
        jobStatus         = $approvedJob.status
        applicationStatus = $updatedApplication.status
        notificationCheck = "ok"
        auditCheck        = "ok"
        aiProviderMode    = $provider.mode
        aiAssistantCheck  = "ok"
    } | ConvertTo-Json -Depth 5
} finally {
    if ($StartStack -and -not $KeepRunning) {
        docker compose down
    }
    Pop-Location
}
