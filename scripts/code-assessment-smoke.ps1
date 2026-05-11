[CmdletBinding()]
param(
    [string]$GatewayUrl = $env:E2E_GATEWAY_URL,
    [int]$HealthTimeoutSeconds = 300
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

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
        TimeoutSec = 45
    }
    if ($null -ne $Body) {
        $params.ContentType = "application/json"
        $params.Body = ($Body | ConvertTo-Json -Depth 14)
    }
    Write-Host "code-assessment-smoke: $Method $Path"
    try {
        $response = Invoke-RestMethod @params
    } catch {
        throw "Request failed for $Method $Path via $GatewayUrl. $($_.Exception.Message)"
    }
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
        email = $Email
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

Set-EnvDefault -Name "GATEWAY_HOST_PORT" -Value "18080"
if ([string]::IsNullOrWhiteSpace($GatewayUrl)) {
    $GatewayUrl = "http://localhost:$env:GATEWAY_HOST_PORT"
}

Wait-HttpOk -Url "$GatewayUrl/actuator/health/readiness" -TimeoutSeconds $HealthTimeoutSeconds

$adminToken = Login -Email "admin@devhire.local" -Password "Admin@123456"
$employerToken = Login -Email "employer@devhire.local" -Password "Employer@123456"
$candidateToken = Login -Email "candidate@devhire.local" -Password "Candidate@123456"
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

$company = Invoke-Api -Method POST -Path "/api/companies" -Token $employerToken -Body @{
    name = "DevHire Code Assessment Smoke $stamp"
    logoUrl = "https://cdn.devhire.local/logos/code-smoke.png"
    website = "https://devhire.local"
    size = "51-200"
    industry = "Software"
    description = "Company created by automated code assessment smoke verification."
}
$approvedCompany = Invoke-Api -Method PATCH -Path "/api/admin/companies/$($company.id)/approve" -Token $adminToken -Body @{
    reason = "Automated code assessment smoke verification"
}
Assert-Equals -Actual $approvedCompany.status -Expected "APPROVED" -Message "Company approval failed"

$job = Invoke-Api -Method POST -Path "/api/jobs" -Token $employerToken -Body @{
    companyId = $company.id
    title = "Senior Java Assessment Smoke $stamp"
    description = "Verify Java CandidateSolution solve contract through the DevHire assessment runtime."
    requirements = "Java 21, Spring Boot, PostgreSQL, Docker"
    benefits = "Automated smoke verification"
    salaryMin = 3500
    salaryMax = 6500
    location = "Ho Chi Minh City"
    level = "Senior"
    type = "FULL_TIME"
    skills = @("Java", "Runtime Validation", "Security")
}
$submittedJob = Invoke-Api -Method PATCH -Path "/api/jobs/$($job.id)/submit-review" -Token $employerToken
Assert-Equals -Actual $submittedJob.status -Expected "PENDING_REVIEW" -Message "Job review submission failed"
$approvedJob = Invoke-Api -Method PATCH -Path "/api/admin/jobs/$($job.id)/approve" -Token $adminToken
Assert-Equals -Actual $approvedJob.status -Expected "PUBLISHED" -Message "Job approval failed"

$application = Invoke-Api -Method POST -Path "/api/jobs/$($job.id)/applications" -Token $candidateToken -Body @{
    cvUrl = "https://cdn.devhire.local/cv/code-assessment-smoke.pdf"
    coverLetter = "Automated code assessment verification application."
}
$interviewApplication = Invoke-Api -Method PATCH -Path "/api/applications/$($application.id)/status" -Token $employerToken -Body @{
    status = "INTERVIEW"
    note = "Ready for code assessment smoke."
}
Assert-Equals -Actual $interviewApplication.status -Expected "INTERVIEW" -Message "Application status update failed"

$assignment = Invoke-Api -Method POST -Path "/api/employer/applications/$($application.id)/code-assessments" -Token $employerToken -Body @{}
if ([string]::IsNullOrWhiteSpace($assignment.id)) {
    throw "Assignment endpoint did not return an assignment id"
}
if ($assignment.challengeTitle -ne "Cloud Architecture Challenge") {
    throw "Default challenge should be Cloud Architecture Challenge but was '$($assignment.challengeTitle)'"
}

$code = @'
class CandidateSolution {
  String solve(String input) {
    boolean strict = input != null && input.contains("policy=STRICT");
    boolean production = input != null && input.contains("tag=production");
    return strict && production ? "PASSED" : "REJECTED";
  }
}
'@

$run = Invoke-Api -Method POST -Path "/api/candidate/code-assessments/$($assignment.id)/run" -Token $candidateToken -Body @{
    language = "Java"
    code = $code
    integrityEvents = @()
    clientFingerprintHash = "code-assessment-smoke"
    elapsedSeconds = 60
    customInput = "resource=res-smoke;policy=STRICT;tag=production"
}
if ($run.visibleTotal -lt 1) {
    throw "Visible run did not execute any cases"
}

$submission = Invoke-Api -Method POST -Path "/api/candidate/code-assessments/$($assignment.id)/submit" -Token $candidateToken -Body @{
    language = "Java"
    code = $code
    notes = "Smoke verification for server-side hidden grading."
    integrityEvents = @()
    clientFingerprintHash = "code-assessment-smoke"
    elapsedSeconds = 90
}
if ($null -eq $submission.latestScore) {
    throw "Submission did not return a final score"
}
$candidateJson = $submission | ConvertTo-Json -Depth 20
if ($candidateJson -match "res-hidden|Hidden malformed|expectedOutput") {
    throw "Candidate submission response leaked hidden payload or expected output"
}

$candidateHistory = Invoke-Api -Method GET -Path "/api/candidate/code-assessments/$($assignment.id)/submissions" -Token $candidateToken
$candidateHistoryJson = $candidateHistory | ConvertTo-Json -Depth 20
if ($candidateHistoryJson -match "res-hidden|Hidden malformed|expectedOutput") {
    throw "Candidate submission history leaked hidden payload or expected output"
}

$employerHistory = Invoke-Api -Method GET -Path "/api/employer/code-assessments/$($assignment.id)/submissions" -Token $employerToken
$employerHistoryJson = $employerHistory | ConvertTo-Json -Depth 20
if ($employerHistoryJson -notmatch "hiddenTotal") {
    throw "Employer history did not include hidden aggregate metadata"
}

$reviewed = Invoke-Api -Method PATCH -Path "/api/employer/code-assessments/$($assignment.id)/review" -Token $employerToken -Body @{
    decision = "PASS"
    note = "Automated code assessment smoke passed."
}
Assert-Equals -Actual $reviewed.latestDecision -Expected "PASS" -Message "Employer review decision failed"

$summary = Invoke-Api -Method GET -Path "/api/admin/code-assessments/summary" -Token $adminToken
if ($summary.totalAssignments -lt 1) {
    throw "Admin summary did not include assessment assignments"
}
if ($null -eq $summary.runnerHealth) {
    throw "Admin summary did not include runner health"
}

[pscustomobject]@{
    gateway = $GatewayUrl
    applicationId = $application.id
    assignmentId = $assignment.id
    challengeTitle = $assignment.challengeTitle
    visiblePassed = $run.visiblePassed
    visibleTotal = $run.visibleTotal
    finalScore = $submission.latestScore
    reviewDecision = $reviewed.latestDecision
    runnerHealth = "$($summary.runnerHealth.status)/$($summary.runnerHealth.mode)"
} | ConvertTo-Json -Depth 6
