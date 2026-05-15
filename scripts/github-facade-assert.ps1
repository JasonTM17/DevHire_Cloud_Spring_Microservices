[CmdletBinding()]
param(
    [switch]$AllowOwnerActions,
    [switch]$MetadataOnly,
    [switch]$BranchProtectionOnly,
    [switch]$RequireProtectionDetails,

    [string]$Owner = "JasonTM17",
    [string]$Repo = "DevHire_Cloud_Spring_Microservices",
    [string]$DefaultBranch = "master",
    [string]$ExpectedHomepage = "https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.6.0",
    [string]$ExpectedDescription = "Production-grade Java 21 Spring Boot microservices recruitment platform with JWT, Kafka, OpenSearch, Docker, Kubernetes, Terraform, observability, CI/CD, and Claude Haiku AI RAG assistant.",
    [string[]]$ExpectedTopics = @(
        "java",
        "spring-boot",
        "microservices",
        "spring-cloud",
        "postgresql",
        "kafka",
        "opensearch",
        "redis",
        "docker",
        "kubernetes",
        "terraform",
        "aws",
        "prometheus",
        "grafana",
        "nextjs",
        "anthropic",
        "claude",
        "rag",
        "devops",
        "portfolio"
    ),
    [string]$OutputDir = "reports/github-facade"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($MetadataOnly -and $BranchProtectionOnly) {
    throw "Use either -MetadataOnly or -BranchProtectionOnly, not both."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputRoot = if ([System.IO.Path]::IsPathRooted($OutputDir)) {
    [System.IO.Path]::GetFullPath($OutputDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OutputDir))
}
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$token = if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_TOKEN)) {
    $env:GITHUB_TOKEN
} elseif (-not [string]::IsNullOrWhiteSpace($env:REPO_GOVERNANCE_TOKEN)) {
    $env:REPO_GOVERNANCE_TOKEN
} else {
    $null
}
$tokenPresent = -not [string]::IsNullOrWhiteSpace($token)

$headers = @{
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent" = "DevHire-GitHub-Facade-Assert"
}
if ($tokenPresent) {
    $headers["Authorization"] = "Bearer $token"
}

function Invoke-GitHubJson {
    param([Parameter(Mandatory = $true)][string]$Uri)

    try {
        [pscustomobject]@{
            ok = $true
            statusCode = 200
            value = Invoke-RestMethod -Method Get -Uri $Uri -Headers $headers
            error = $null
        }
    } catch {
        $statusCode = $null
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        [pscustomobject]@{
            ok = $false
            statusCode = $statusCode
            value = $null
            error = $_.Exception.Message
        }
    }
}

function New-Check {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][bool]$Passed,
        [Parameter(Mandatory = $true)][string]$Details
    )

    [pscustomobject]@{
        name = $Name
        passed = $Passed
        details = $Details
    }
}

$apiRoot = "https://api.github.com/repos/$Owner/$Repo"
$repoResult = Invoke-GitHubJson -Uri $apiRoot
$branchResult = Invoke-GitHubJson -Uri "$apiRoot/branches/$DefaultBranch"
$protectionResult = Invoke-GitHubJson -Uri "$apiRoot/branches/$DefaultBranch/protection"

$checks = [System.Collections.Generic.List[object]]::new()

if (-not $BranchProtectionOnly) {
    $description = if ($repoResult.ok) { [string]$repoResult.value.description } else { "" }
    $homepage = if ($repoResult.ok) { [string]$repoResult.value.homepage } else { "" }
    $topics = if ($repoResult.ok -and $repoResult.value.topics) { @($repoResult.value.topics) } else { @() }

    $checks.Add((New-Check -Name "description" -Passed ($description -eq $ExpectedDescription) -Details "current='$description'"))
    $checks.Add((New-Check -Name "homepage" -Passed ($homepage -eq $ExpectedHomepage) -Details "current='$homepage'"))

    $topicList = @($topics)
    $missingTopics = @($ExpectedTopics | Where-Object { $topicList -notcontains $_ })
    $unexpectedTopics = @($topicList | Where-Object { $ExpectedTopics -notcontains $_ })
    $topicsPassed = $missingTopics.Count -eq 0 -and $unexpectedTopics.Count -eq 0 -and $topicList.Count -eq $ExpectedTopics.Count
    $missingTopicText = if ($missingTopics.Count -gt 0) { $missingTopics -join ', ' } else { 'none' }
    $unexpectedTopicText = if ($unexpectedTopics.Count -gt 0) { $unexpectedTopics -join ', ' } else { 'none' }
    $checks.Add((New-Check -Name "topics" -Passed $topicsPassed -Details "current=$($topicList.Count), missing=$missingTopicText, unexpected=$unexpectedTopicText"))
}

if (-not $MetadataOnly) {
    $branchProtected = if ($branchResult.ok) { [bool]$branchResult.value.protected } else { $false }
    $protectionDetailsRequired = [bool]$RequireProtectionDetails -or $tokenPresent
    $checks.Add((New-Check -Name "branch protected" -Passed $branchProtected -Details "protected=$branchProtected"))

    if ($protectionResult.ok) {
        $checks.Add((New-Check -Name "branch protection details" -Passed $true -Details "readable=true"))
    } elseif (-not $protectionDetailsRequired -and $branchProtected -and $protectionResult.statusCode -in @(401, 403)) {
        $checks.Add((New-Check -Name "branch protection details" -Passed $true -Details "public-limited statusCode=$($protectionResult.statusCode); branch endpoint confirms protected=true"))
    } else {
        $detailMode = if ($protectionDetailsRequired) { "required" } else { "best-effort" }
        $checks.Add((New-Check -Name "branch protection details" -Passed $false -Details "$detailMode statusCode=$($protectionResult.statusCode)"))
    }
}

$failedChecks = @($checks | Where-Object { -not $_.passed })
$status = if ($failedChecks.Count -eq 0) {
    "passed"
} elseif ($AllowOwnerActions) {
    "owner_action_required"
} else {
    "failed"
}

$summary = [pscustomobject]@{
    status = $status
    generatedAt = (Get-Date).ToString("o")
    repository = "$Owner/$Repo"
    tokenPresent = $tokenPresent
    allowOwnerActions = [bool]$AllowOwnerActions
    requireProtectionDetails = [bool]$RequireProtectionDetails
    checks = @($checks)
    failedChecks = @($failedChecks)
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $outputRoot "github-facade-$stamp.json"
$mdPath = Join-Path $outputRoot "github-facade-$stamp.md"
$summary | ConvertTo-Json -Depth 10 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# GitHub Facade Assertion")
$lines.Add("")
$lines.Add("- Status: $status")
$lines.Add("- Repository: $Owner/$Repo")
$lines.Add("- Token present: $($summary.tokenPresent)")
$lines.Add("- Allow owner actions: $($summary.allowOwnerActions)")
$lines.Add("")
$lines.Add("| Check | Passed | Details |")
$lines.Add("|---|---|---|")
foreach ($check in $checks) {
    $lines.Add("| $($check.name) | $($check.passed) | $($check.details.Replace('|', '/')) |")
}
$lines | Set-Content -Path $mdPath -Encoding UTF8

Write-Host "GitHub facade assertion:"
Write-Host ("  status       : {0}" -f $status)
Write-Host ("  repository   : {0}/{1}" -f $Owner, $Repo)
Write-Host ("  failed checks: {0}" -f $failedChecks.Count)
Write-Host ""
Write-Host "Reports:"
Write-Host "  $jsonPath"
Write-Host "  $mdPath"

if ($failedChecks.Count -gt 0 -and -not $AllowOwnerActions) {
    $names = ($failedChecks | ForEach-Object { $_.name }) -join ", "
    throw "GitHub public facade assertion failed: $names"
}
