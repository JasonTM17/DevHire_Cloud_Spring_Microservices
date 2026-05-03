[CmdletBinding()]
param(
    [string]$GatewayUrl = $(if ($env:E2E_GATEWAY_URL) { $env:E2E_GATEWAY_URL } else { "http://localhost:8080" }),
    [ValidateSet("opensearch", "kafka", "ai", "mail", "all")]
    [string]$Scenario = "all",
    [switch]$Recover,
    [int]$TimeoutSeconds = 180
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$stoppedServices = New-Object System.Collections.Generic.List[string]

function Wait-HttpOk {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$TimeoutSeconds = 180
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return
            }
        } catch {
            Start-Sleep -Seconds 3
        }
    } while ((Get-Date) -lt $deadline)

    throw "Timed out waiting for $Url"
}

function Invoke-Api {
    param(
        [Parameter(Mandatory = $true)][ValidateSet("GET", "POST", "PATCH")][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [string]$Token,
        $Body = $null,
        [int]$TimeoutSec = 30
    )

    $headers = @{}
    if (-not [string]::IsNullOrWhiteSpace($Token)) {
        $headers.Authorization = "Bearer $Token"
    }

    $params = @{
        Method     = $Method
        Uri        = "$GatewayUrl$Path"
        Headers    = $headers
        TimeoutSec = $TimeoutSec
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

function Assert-True {
    param(
        [bool]$Condition,
        [Parameter(Mandatory = $true)][string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
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
    Assert-True -Condition (-not [string]::IsNullOrWhiteSpace($response.accessToken)) -Message "Login for $Email did not return token"
    return $response.accessToken
}

function Stop-ComposeService {
    param([Parameter(Mandatory = $true)][string]$Service)

    $containerId = docker compose ps -q $Service
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($containerId)) {
        Write-Warning "Compose service '$Service' is not present or not running; skipping stop."
        return
    }

    docker compose stop $Service
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to stop compose service $Service"
    }
    $stoppedServices.Add($Service)
    Start-Sleep -Seconds 8
}

function Recover-StoppedServices {
    if (-not $Recover) {
        return
    }
    for ($i = $stoppedServices.Count - 1; $i -ge 0; $i--) {
        $service = $stoppedServices[$i]
        Write-Host "Recovering $service"
        docker compose start $service
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to recover compose service $service"
        }
    }
    if ($stoppedServices.Count -gt 0) {
        Wait-HttpOk -Url "$GatewayUrl/actuator/health/readiness" -TimeoutSeconds $TimeoutSeconds
    }
}

function Get-OutboxPendingCount {
    param(
        [Parameter(Mandatory = $true)][string]$Database
    )

    $sql = "SELECT count(*) FROM outbox_events WHERE status IN ('PENDING','FAILED','DEAD_LETTER') AND created_at > now() - interval '10 minutes';"
    $output = docker exec devhire-postgres psql -U devhire -d $Database -tAc $sql
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Could not query $Database outbox; returning -1."
        return -1
    }
    return [int]($output | Select-Object -First 1).Trim()
}

function Get-RecentNotificationCount {
    param(
        [Parameter(Mandatory = $true)][string]$RecipientId,
        [Parameter(Mandatory = $true)][string]$Type,
        [Parameter(Mandatory = $true)][string]$MessageLike,
        [Parameter(Mandatory = $true)][DateTime]$SinceUtc
    )

    $escapedMessage = $MessageLike.Replace("'", "''")
    $since = $SinceUtc.ToString("yyyy-MM-dd HH:mm:ss")
    $sql = "SELECT count(*) FROM notifications WHERE recipient_id = '$RecipientId' AND type = '$Type' AND message LIKE '%$escapedMessage%' AND created_at >= timestamptz '$since+00';"
    $output = docker exec devhire-postgres psql -U devhire -d devhire_notification -tAc $sql
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Could not query notification evidence; returning -1."
        return -1
    }
    return [int]($output | Select-Object -First 1).Trim()
}

function Invoke-CompanyCreate {
    param([string]$EmployerToken)

    $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    return Invoke-Api -Method POST -Path "/api/companies" -Token $EmployerToken -Body @{
        name        = "DevHire Chaos Company $stamp"
        logoUrl     = "https://cdn.devhire.local/logos/chaos.png"
        website     = "https://devhire.local"
        size        = "51-200"
        industry    = "Software"
        description = "Generated by resilience smoke verification."
    }
}

function Invoke-ApplicationFlow {
    param(
        [string]$AdminToken,
        [string]$EmployerToken,
        [string]$CandidateToken
    )

    $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    $company = Invoke-Api -Method POST -Path "/api/companies" -Token $EmployerToken -Body @{
        name        = "DevHire Chaos Mail $stamp"
        logoUrl     = "https://cdn.devhire.local/logos/chaos-mail.png"
        website     = "https://devhire.local"
        size        = "51-200"
        industry    = "Software"
        description = "Generated by mail resilience smoke verification."
    }
    $company = Invoke-Api -Method PATCH -Path "/api/admin/companies/$($company.id)/approve" -Token $AdminToken

    $job = Invoke-Api -Method POST -Path "/api/jobs" -Token $EmployerToken -Body @{
        companyId    = $company.id
        title        = "Senior Java Chaos Mail $stamp"
        description  = "Verify internal notification survives SMTP outage."
        requirements = "Java 21, Spring Boot, Kafka, PostgreSQL"
        benefits     = "Operational confidence"
        salaryMin    = 3000
        salaryMax    = 6000
        location     = "Ho Chi Minh City"
        level        = "Senior"
        type         = "FULL_TIME"
        skills       = @("Java", "Kafka", "Operations")
    }
    $null = Invoke-Api -Method PATCH -Path "/api/jobs/$($job.id)/submit-review" -Token $EmployerToken
    $job = Invoke-Api -Method PATCH -Path "/api/admin/jobs/$($job.id)/approve" -Token $AdminToken
    $application = Invoke-Api -Method POST -Path "/api/jobs/$($job.id)/applications" -Token $CandidateToken -Body @{
        cvUrl       = "https://cdn.devhire.local/cv/chaos-mail.pdf"
        coverLetter = "Generated by chaos mail resilience smoke."
    }
    return @{
        jobId         = $job.id
        applicationId = $application.id
        jobTitle      = $job.title
    }
}

function Invoke-OpenSearchScenario {
    Write-Host "Chaos scenario: OpenSearch down, job search should fall back."
    Stop-ComposeService -Service "opensearch"
    $search = Invoke-Api -Method GET -Path "/api/jobs?keyword=Java&size=5" -TimeoutSec 45
    $json = $search | ConvertTo-Json -Depth 12
    Assert-True -Condition ($json.Length -gt 20) -Message "Job search fallback returned an empty response while OpenSearch was down"
    Write-Host "OpenSearch scenario passed: job search still returned data through Gateway."
}

function Invoke-KafkaScenario {
    Write-Host "Chaos scenario: Kafka down, business write should persist outbox."
    $employerToken = Login -Email "employer@devhire.local" -Password "Employer@123456"
    Stop-ComposeService -Service "kafka"
    $company = Invoke-CompanyCreate -EmployerToken $employerToken
    Assert-True -Condition (-not [string]::IsNullOrWhiteSpace($company.id)) -Message "Company create failed while Kafka was down"
    Start-Sleep -Seconds 5
    $pending = Get-OutboxPendingCount -Database "devhire_company"
    Assert-True -Condition ($pending -gt 0) -Message "Expected pending or failed outbox evidence while Kafka was down"
    Write-Host "Kafka scenario passed: company write succeeded and outbox has pending/failed evidence count=$pending."
}

function Invoke-AiScenario {
    Write-Host "Chaos scenario: AI provider unavailable or disabled, assistant should return fallback answer."
    $adminToken = Login -Email "admin@devhire.local" -Password "Admin@123456"
    $candidateToken = Login -Email "candidate@devhire.local" -Password "Candidate@123456"
    $status = Invoke-Api -Method GET -Path "/api/admin/ai/provider/status" -Token $adminToken
    $chat = Invoke-Api -Method POST -Path "/api/ai/chat" -Token $candidateToken -TimeoutSec 60 -Body @{
        message = "What happens when the AI provider is unavailable in this portfolio?"
    }
    Assert-True -Condition (-not [string]::IsNullOrWhiteSpace($chat.answer)) -Message "AI chat did not return an answer"
    Assert-True -Condition ($chat.fallback -or $status.mode -eq "DEMO_FALLBACK" -or $status.circuitBreakerState -eq "OPEN") -Message "AI scenario did not expose fallback/circuit evidence"
    Write-Host "AI scenario passed: mode=$($status.mode), circuit=$($status.circuitBreakerState), fallback=$($chat.fallback)."
}

function Invoke-MailScenario {
    Write-Host "Chaos scenario: SMTP sandbox down, internal notification should still persist."
    $adminToken = Login -Email "admin@devhire.local" -Password "Admin@123456"
    $employerToken = Login -Email "employer@devhire.local" -Password "Employer@123456"
    $candidateToken = Login -Email "candidate@devhire.local" -Password "Candidate@123456"
    $startedAt = (Get-Date).ToUniversalTime()
    Stop-ComposeService -Service "mailpit"
    $flow = Invoke-ApplicationFlow -AdminToken $adminToken -EmployerToken $employerToken -CandidateToken $candidateToken
    $null = Invoke-Api -Method PATCH -Path "/api/applications/$($flow.applicationId)/status" -Token $employerToken -Body @{
        status = "INTERVIEW"
        note   = "Chaos mail resilience status update"
    }

    $deadline = (Get-Date).AddSeconds([Math]::Min($TimeoutSeconds, 120))
    do {
        Start-Sleep -Seconds 5
        $notificationCount = Get-RecentNotificationCount `
            -RecipientId "00000000-0000-0000-0000-000000000003" `
            -Type "APPLICATION_STATUS_CHANGED" `
            -MessageLike "SUBMITTED to INTERVIEW" `
            -SinceUtc $startedAt
        if ($notificationCount -gt 0) {
            Write-Host "Mail scenario passed: candidate internal notification persisted while SMTP sandbox was unavailable."
            return
        }
    } while ((Get-Date) -lt $deadline)

    throw "Candidate internal notification was not persisted while SMTP sandbox was down"
}

Push-Location $repoRoot
try {
    Wait-HttpOk -Url "$GatewayUrl/actuator/health/readiness" -TimeoutSeconds $TimeoutSeconds

    $scenarios = if ($Scenario -eq "all") {
        @("opensearch", "kafka", "ai", "mail")
    } else {
        @($Scenario)
    }

    foreach ($item in $scenarios) {
        switch ($item) {
            "opensearch" { Invoke-OpenSearchScenario }
            "kafka" { Invoke-KafkaScenario }
            "ai" { Invoke-AiScenario }
            "mail" { Invoke-MailScenario }
        }
        Recover-StoppedServices
        $stoppedServices.Clear()
    }

    Write-Host "Chaos smoke passed for scenario '$Scenario'."
} finally {
    if ($Recover) {
        Recover-StoppedServices
    }
    Pop-Location
}
