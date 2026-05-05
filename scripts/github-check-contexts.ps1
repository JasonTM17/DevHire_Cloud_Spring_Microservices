[CmdletBinding()]
param(
    [string]$Owner = "JasonTM17",
    [string]$Repo = "DevHire_Cloud_Spring_Microservices",
    [string]$Branch = "master",
    [string]$OutputDir = "reports/github-check-contexts",
    [string[]]$ExpectedContexts = @(
        "Maven Verify",
        "Portfolio docs quality",
        "Gitleaks Secret Scan",
        "Trivy Filesystem Scan",
        "Generate SBOM",
        "Maven Dependency Tree",
        "Build api-gateway",
        "Build frontend",
        "Analyze java-kotlin",
        "Analyze javascript-typescript"
    )
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputRoot = if ([System.IO.Path]::IsPathRooted($OutputDir)) {
    [System.IO.Path]::GetFullPath($OutputDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OutputDir))
}
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$headers = @{
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent" = "DevHire-GitHub-Check-Contexts"
}

$token = if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_TOKEN)) {
    $env:GITHUB_TOKEN
} elseif (-not [string]::IsNullOrWhiteSpace($env:REPO_GOVERNANCE_TOKEN)) {
    $env:REPO_GOVERNANCE_TOKEN
} else {
    $null
}

if (-not [string]::IsNullOrWhiteSpace($token)) {
    $headers["Authorization"] = "Bearer $token"
}

function Invoke-GitHubJson {
    param(
        [Parameter(Mandatory = $true)][string]$Uri
    )

    try {
        $value = Invoke-RestMethod -Method Get -Uri $Uri -Headers $headers
        [pscustomobject]@{ ok = $true; value = $value; error = $null }
    } catch {
        [pscustomobject]@{ ok = $false; value = $null; error = $_.Exception.Message }
    }
}

$apiRoot = "https://api.github.com/repos/$Owner/$Repo"
$runsResult = Invoke-GitHubJson -Uri "$apiRoot/actions/runs?branch=$Branch&per_page=30"
if (-not $runsResult.ok) {
    throw "Cannot read workflow runs: $($runsResult.error)"
}

$jobs = [System.Collections.Generic.List[object]]::new()
foreach ($run in @($runsResult.value.workflow_runs)) {
    if ($run.conclusion -ne "success") {
        continue
    }

    $jobsResult = Invoke-GitHubJson -Uri $run.jobs_url
    if (-not $jobsResult.ok) {
        continue
    }

    foreach ($job in @($jobsResult.value.jobs)) {
        $jobs.Add([pscustomobject]@{
            workflow = $run.name
            runId = $run.id
            runUrl = $run.html_url
            name = $job.name
            status = $job.status
            conclusion = $job.conclusion
            completedAt = $job.completed_at
        })
    }
}

$contextNames = @($jobs | Select-Object -ExpandProperty name -Unique | Sort-Object)
$missing = @($ExpectedContexts | Where-Object { $_ -notin $contextNames })
$status = if ($missing.Count -eq 0) { "passed" } else { "failed" }

$summary = [ordered]@{
    status = $status
    generatedAt = (Get-Date).ToString("o")
    repository = "$Owner/$Repo"
    branch = $Branch
    tokenPresent = -not [string]::IsNullOrWhiteSpace($token)
    expectedContexts = $ExpectedContexts
    observedContexts = $contextNames
    missingContexts = $missing
    successfulJobs = @($jobs)
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $outputRoot "github-check-contexts-$stamp.json"
$mdPath = Join-Path $outputRoot "github-check-contexts-$stamp.md"
$summary | ConvertTo-Json -Depth 20 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# GitHub Required Check Context Audit")
$lines.Add("")
$lines.Add("- Status: $status")
$lines.Add("- Repository: $Owner/$Repo")
$lines.Add("- Branch: $Branch")
$lines.Add("- Generated: $($summary.generatedAt)")
$lines.Add("- Token present: $($summary.tokenPresent)")
$lines.Add("")
$lines.Add("## Expected Contexts")
$lines.Add("")
foreach ($context in $ExpectedContexts) {
    $mark = if ($context -in $contextNames) { "PASS" } else { "MISSING" }
    $lines.Add("- $mark - $context")
}
$lines.Add("")
$lines.Add("## Observed Successful Job Contexts")
$lines.Add("")
foreach ($context in $contextNames) {
    $lines.Add("- $context")
}
$lines | Set-Content -Path $mdPath -Encoding UTF8

Write-Host "GitHub required check context audit: $status"
Write-Host "Reports:"
Write-Host "  $jsonPath"
Write-Host "  $mdPath"

if ($status -ne "passed") {
    throw "Required check context audit failed. Missing: $($missing -join ', ')"
}
