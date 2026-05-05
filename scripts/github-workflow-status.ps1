[CmdletBinding()]
param(
    [switch]$RequireGreen,

    [string]$Owner = "JasonTM17",
    [string]$Repo = "DevHire_Cloud_Spring_Microservices",
    [string]$Branch = "master",
    [string]$HeadSha = "",
    [string[]]$RequiredWorkflows = @(
        "CI",
        "Docker Images",
        "Documentation",
        "Security",
        "CodeQL",
        "E2E Smoke"
    ),
    [string]$OutputDir = "reports/github-workflow-status"
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

$token = if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_TOKEN)) {
    $env:GITHUB_TOKEN
} elseif (-not [string]::IsNullOrWhiteSpace($env:REPO_GOVERNANCE_TOKEN)) {
    $env:REPO_GOVERNANCE_TOKEN
} else {
    $null
}
$hasToken = -not [string]::IsNullOrWhiteSpace($token)

$apiRoot = "https://api.github.com/repos/$Owner/$Repo"
$headers = @{
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent" = "DevHire-GitHub-Workflow-Status"
}
if ($hasToken) {
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

$branchResult = Invoke-GitHubJson -Uri "$apiRoot/branches/$Branch"
if ([string]::IsNullOrWhiteSpace($HeadSha)) {
    if ($branchResult.ok -and $branchResult.value.commit.sha) {
        $HeadSha = [string]$branchResult.value.commit.sha
    } else {
        Push-Location $repoRoot
        try {
            $HeadSha = (git rev-parse HEAD).Trim()
        } finally {
            Pop-Location
        }
    }
}

$runsResult = Invoke-GitHubJson -Uri "$apiRoot/actions/runs?branch=$Branch&per_page=100"
if (-not $runsResult.ok) {
    throw "Failed to read GitHub Actions runs: $($runsResult.error)"
}

$runs = @($runsResult.value.workflow_runs)
$workflowRows = [System.Collections.Generic.List[object]]::new()
foreach ($workflow in $RequiredWorkflows) {
    $matching = @($runs | Where-Object { $_.name -eq $workflow -and $_.head_sha -eq $HeadSha } | Sort-Object created_at -Descending)
    $run = if ($matching.Count -gt 0) { $matching[0] } else { $null }
    if ($null -eq $run) {
        $workflowRows.Add([pscustomobject]@{
            workflow = $workflow
            found = $false
            status = "missing"
            conclusion = "missing"
            url = $null
            runId = $null
            headSha = $HeadSha
        })
    } else {
        $workflowRows.Add([pscustomobject]@{
            workflow = $workflow
            found = $true
            status = [string]$run.status
            conclusion = if ($run.conclusion) { [string]$run.conclusion } else { "none" }
            url = [string]$run.html_url
            runId = [int64]$run.id
            headSha = [string]$run.head_sha
        })
    }
}

$failedRows = @($workflowRows | Where-Object { -not $_.found -or $_.status -ne "completed" -or $_.conclusion -ne "success" })
$status = if ($failedRows.Count -eq 0) { "green" } else { "not_green" }

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $outputRoot "github-workflow-status-$stamp.json"
$mdPath = Join-Path $outputRoot "github-workflow-status-$stamp.md"

$summary = [ordered]@{
    generatedAt = (Get-Date).ToString("o")
    repository = "$Owner/$Repo"
    branch = $Branch
    headSha = $HeadSha
    status = $status
    requireGreen = [bool]$RequireGreen
    tokenPresent = $hasToken
    workflows = @($workflowRows)
    failedWorkflows = @($failedRows)
}
$summary | ConvertTo-Json -Depth 12 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# GitHub Workflow Status")
$lines.Add("")
$lines.Add("- Repository: $Owner/$Repo")
$lines.Add("- Branch: $Branch")
$lines.Add("- Head SHA: $HeadSha")
$lines.Add("- Status: $status")
$lines.Add("- Token present: $hasToken")
$lines.Add("")
$lines.Add("| Workflow | Status | Conclusion | URL |")
$lines.Add("|---|---|---|---|")
foreach ($row in $workflowRows) {
    $url = if ($row.url) { "[run]($($row.url))" } else { "missing" }
    $lines.Add("| $($row.workflow) | $($row.status) | $($row.conclusion) | $url |")
}
$lines | Set-Content -Path $mdPath -Encoding UTF8

Write-Host "GitHub workflow status:"
Write-Host ("  repository  : {0}/{1}" -f $Owner, $Repo)
Write-Host ("  branch      : {0}" -f $Branch)
Write-Host ("  head SHA    : {0}" -f $HeadSha)
Write-Host ("  status      : {0}" -f $status)
Write-Host ("  failed/miss : {0}" -f $failedRows.Count)
Write-Host ""
Write-Host "Reports:"
Write-Host "  $jsonPath"
Write-Host "  $mdPath"

if ($RequireGreen -and $failedRows.Count -gt 0) {
    $names = ($failedRows | ForEach-Object { "$($_.workflow)=$($_.status)/$($_.conclusion)" }) -join ", "
    throw "Required GitHub workflows are not green for $HeadSha`: $names"
}
