[CmdletBinding()]
param(
    [string]$Owner = "JasonTM17",
    [string]$Repo = "DevHire_Cloud_Spring_Microservices",
    [string]$DefaultBranch = "master",
    [string]$LatestRelease = "v0.5.1",
    [string]$OutputDir = "reports/repository-health"
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

$apiRoot = "https://api.github.com/repos/$Owner/$Repo"
$headers = @{
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent" = "DevHire-Repository-Health"
}

$token = if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_TOKEN)) {
    $env:GITHUB_TOKEN
} elseif (-not [string]::IsNullOrWhiteSpace($env:REPO_GOVERNANCE_TOKEN)) {
    $env:REPO_GOVERNANCE_TOKEN
} else {
    $null
}
$hasToken = -not [string]::IsNullOrWhiteSpace($token)
if ($hasToken) {
    $headers["Authorization"] = "Bearer $token"
}

function Invoke-GitHubJson {
    param(
        [Parameter(Mandatory = $true)][string]$Uri
    )

    try {
        $value = Invoke-RestMethod -Method Get -Uri $Uri -Headers $headers
        return [pscustomobject]@{
            ok = $true
            statusCode = 200
            value = $value
            error = $null
        }
    } catch {
        $statusCode = $null
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        return [pscustomobject]@{
            ok = $false
            statusCode = $statusCode
            value = $null
            error = $_.Exception.Message
        }
    }
}

function Get-DependabotCategory {
    param([Parameter(Mandatory = $true)][string]$Title)

    if ($Title -match "github_actions|actions group|actions/") { return "github-actions" }
    if ($Title -match "terraform|hashicorp/aws") { return "terraform" }
    if ($Title -match "@playwright|@types|next|react|typescript|npm|frontend|node from") { return "npm" }
    if ($Title -match "docker|base-images|maven, eclipse-temurin|eclipse-temurin") { return "docker" }
    if ($Title -match "spring|jjwt|testcontainers|springdoc|maven|org\\.") { return "maven" }
    return "other"
}

function Get-LocalEvidenceStatus {
    param([Parameter(Mandatory = $true)][string[]]$Paths)

    foreach ($path in $Paths) {
        [pscustomobject]@{
            path = $path
            exists = Test-Path (Join-Path $repoRoot $path)
        }
    }
}

$repoResult = Invoke-GitHubJson -Uri $apiRoot
$releaseResult = Invoke-GitHubJson -Uri "$apiRoot/releases/tags/$LatestRelease"
$branchResult = Invoke-GitHubJson -Uri "$apiRoot/branches/$DefaultBranch"
$protectionResult = Invoke-GitHubJson -Uri "$apiRoot/branches/$DefaultBranch/protection"
$runsResult = Invoke-GitHubJson -Uri "$apiRoot/actions/runs?branch=$DefaultBranch&per_page=50"
$dependabotResult = Invoke-GitHubJson -Uri "https://api.github.com/search/issues?q=repo:$Owner/$Repo+is:pr+is:open+author:app/dependabot&per_page=100"

$workflowRows = @()
if ($runsResult.ok) {
    $workflowRows = @(
        $runsResult.value.workflow_runs |
            Sort-Object created_at -Descending |
            Group-Object name |
            ForEach-Object {
                $latest = $_.Group | Select-Object -First 1
                [pscustomobject]@{
                    name = $_.Name
                    status = $latest.status
                    conclusion = $latest.conclusion
                    createdAt = $latest.created_at
                    url = $latest.html_url
                }
            } |
            Sort-Object name
    )
}

$dependabotRows = @()
if ($dependabotResult.ok) {
    $dependabotRows = @(
        $dependabotResult.value.items | ForEach-Object {
            [pscustomobject]@{
                number = $_.number
                title = $_.title
                category = Get-DependabotCategory -Title $_.title
                url = $_.html_url
            }
        }
    )
}

$evidenceRows = @(Get-LocalEvidenceStatus -Paths @(
    "docs/status.md",
    "docs/runtime-evidence-v0.4.md",
    "docs/release-notes/v0.5.1.md",
    "docs/release-evidence/v0.5.1.md",
    "docs/github-governance.md",
    "docs/branch-protection.md",
    "docs/dependabot-cleanup-v0.4.md",
    "docs/security-evidence.md",
    "docs/cloud-readiness-review.md",
    "docs/cloud-completion-scorecard.md"
))

$metadata = [ordered]@{
    descriptionSet = if ($repoResult.ok) { -not [string]::IsNullOrWhiteSpace($repoResult.value.description) } else { $false }
    homepageSet = if ($repoResult.ok) { -not [string]::IsNullOrWhiteSpace($repoResult.value.homepage) } else { $false }
    topicCount = if ($repoResult.ok -and $repoResult.value.topics) { @($repoResult.value.topics).Count } else { 0 }
    visibility = if ($repoResult.ok) { $repoResult.value.visibility } else { $null }
    defaultBranch = if ($repoResult.ok) { $repoResult.value.default_branch } else { $null }
}

$releaseStatus = if ($releaseResult.ok) {
    "visible"
} elseif ($releaseResult.statusCode -eq 404) {
    "missing"
} elseif ($releaseResult.statusCode -in @(401, 403, 429)) {
    "unavailable"
} else {
    "unknown"
}

$branchProtected = if ($branchResult.ok) { [bool]$branchResult.value.protected } else { $false }

$health = [ordered]@{
    generatedAt = (Get-Date).ToString("o")
    repository = "$Owner/$Repo"
    hasToken = $hasToken
    metadata = $metadata
    latestRelease = [ordered]@{
        version = $LatestRelease
        status = $releaseStatus
        visible = if ($releaseResult.ok) { $true } else { $null }
        url = if ($releaseResult.ok) { $releaseResult.value.html_url } else { $null }
        statusCode = $releaseResult.statusCode
        error = $releaseResult.error
    }
    branch = [ordered]@{
        name = $DefaultBranch
        protected = $branchProtected
        protectionReadable = $protectionResult.ok
        protectionDetailMode = if ($protectionResult.ok) { "readable" } elseif ($branchProtected -and $protectionResult.statusCode -in @(401, 403)) { "public-limited" } else { "unavailable" }
        protectionStatusCode = $protectionResult.statusCode
    }
    workflows = $workflowRows
    dependabot = [ordered]@{
        openCount = $dependabotRows.Count
        byCategory = @($dependabotRows | Group-Object category | Sort-Object Name | ForEach-Object {
            [pscustomobject]@{ category = $_.Name; count = $_.Count }
        })
    }
    localEvidence = $evidenceRows
    ownerActions = @(
        if (-not $metadata.descriptionSet) { "Set repository About description." }
        if (-not $metadata.homepageSet) { "Set repository homepage." }
        if ($metadata.topicCount -eq 0) { "Add repository topics." }
        if (-not $branchProtected) { "Protect $DefaultBranch." }
    )
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $outputRoot "repository-health-$stamp.json"
$mdPath = Join-Path $outputRoot "repository-health-$stamp.md"
$health | ConvertTo-Json -Depth 20 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# Repository Health")
$lines.Add("")
$lines.Add("- Generated: $($health.generatedAt)")
$lines.Add("- Repository: $Owner/$Repo")
$lines.Add("- Token present: $hasToken")
$lines.Add("- Latest release status: $($health.latestRelease.status)")
$lines.Add("- Branch protected: $($health.branch.protected)")
$lines.Add("- Branch protection detail mode: $($health.branch.protectionDetailMode)")
$lines.Add("- Open Dependabot PRs: $($health.dependabot.openCount)")
$lines.Add("")
$lines.Add("## Metadata")
$lines.Add("")
$lines.Add("| Signal | Status |")
$lines.Add("|---|---|")
$lines.Add("| Description set | $($metadata.descriptionSet) |")
$lines.Add("| Homepage set | $($metadata.homepageSet) |")
$lines.Add("| Topic count | $($metadata.topicCount) |")
$lines.Add("| Visibility | $($metadata.visibility) |")
$lines.Add("| Default branch | $($metadata.defaultBranch) |")
$lines.Add("")
$lines.Add("## Latest Workflow Runs")
$lines.Add("")
$lines.Add("| Workflow | Status | Conclusion |")
$lines.Add("|---|---|---|")
foreach ($workflow in $workflowRows) {
    $lines.Add("| [$($workflow.name)]($($workflow.url)) | $($workflow.status) | $($workflow.conclusion) |")
}
$lines.Add("")
$lines.Add("## Dependabot Categories")
$lines.Add("")
$lines.Add("| Category | Count |")
$lines.Add("|---|---:|")
foreach ($group in $health.dependabot.byCategory) {
    $lines.Add("| $($group.category) | $($group.count) |")
}
$lines.Add("")
$lines.Add("## Local Evidence")
$lines.Add("")
$lines.Add("| Path | Exists |")
$lines.Add("|---|---|")
foreach ($evidence in $evidenceRows) {
    $lines.Add("| `$($evidence.path)` | $($evidence.exists) |")
}
$lines.Add("")
$lines.Add("## Owner Actions")
$lines.Add("")
if (@($health.ownerActions).Count -eq 0) {
    $lines.Add("None.")
} else {
    foreach ($action in $health.ownerActions) {
        $lines.Add("- $action")
    }
}
$lines | Set-Content -Path $mdPath -Encoding UTF8

Write-Host "Repository health summary:"
Write-Host ("  repository        : {0}/{1}" -f $Owner, $Repo)
Write-Host ("  token present      : {0}" -f $hasToken)
Write-Host ("  description set    : {0}" -f $metadata.descriptionSet)
Write-Host ("  homepage set       : {0}" -f $metadata.homepageSet)
Write-Host ("  topic count        : {0}" -f $metadata.topicCount)
Write-Host ("  release status     : {0}" -f $health.latestRelease.status)
Write-Host ("  branch protected   : {0}" -f $health.branch.protected)
Write-Host ("  dependabot PRs     : {0}" -f $health.dependabot.openCount)
Write-Host ""
Write-Host "Reports:"
Write-Host "  $jsonPath"
Write-Host "  $mdPath"
