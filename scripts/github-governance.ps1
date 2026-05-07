[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Apply,
    [switch]$MetadataOnly,
    [switch]$BranchProtectionOnly,

    [string]$Owner = "JasonTM17",
    [string]$Repo = "DevHire_Cloud_Spring_Microservices",
    [string]$DefaultBranch = "master",
    [string]$LatestRelease = "v0.5.1",
    [string]$OutputDir = "reports/github-governance",
    [string]$Homepage = "https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.5.1",
    [string]$Description = "Production-grade Java 21 Spring Boot microservices recruitment platform with JWT, Kafka, OpenSearch, Docker, Kubernetes, Terraform, observability, CI/CD, and Claude Haiku AI RAG assistant.",
    [string[]]$RequiredChecks = @(
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
    ),
    [string[]]$Topics = @(
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
    )
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($MetadataOnly -and $BranchProtectionOnly) {
    throw "Use either -MetadataOnly or -BranchProtectionOnly, not both."
}

if (-not $DryRun -and -not $Apply) {
    $DryRun = $true
}

if ($Topics.Count -gt 20) {
    throw "GitHub supports at most 20 repository topics. Current count: $($Topics.Count)"
}

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
    "User-Agent" = "DevHire-GitHub-Governance"
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

$repoPayload = [ordered]@{
    description = $Description
    homepage = $Homepage
    has_issues = $true
    has_projects = $true
    has_wiki = $false
    allow_squash_merge = $true
    allow_merge_commit = $false
    allow_rebase_merge = $true
    delete_branch_on_merge = $true
}

$topicsPayload = [ordered]@{
    names = $Topics
}

$branchProtectionPayload = [ordered]@{
    required_status_checks = [ordered]@{
        strict = $true
        contexts = $RequiredChecks
    }
    enforce_admins = $true
    required_pull_request_reviews = [ordered]@{
        dismiss_stale_reviews = $true
        require_code_owner_reviews = $true
        required_approving_review_count = 1
        require_last_push_approval = $false
    }
    restrictions = $null
    required_conversation_resolution = $true
    allow_force_pushes = $false
    allow_deletions = $false
    block_creations = $false
    required_linear_history = $false
    lock_branch = $false
    allow_fork_syncing = $true
}

function Invoke-GitHubJson {
    param(
        [Parameter(Mandatory = $true)][ValidateSet("Get", "Patch", "Put", "Post")][string]$Method,
        [Parameter(Mandatory = $true)][string]$Uri,
        [object]$Body = $null
    )

    try {
        $invokeParams = @{
            Method = $Method
            Uri = $Uri
            Headers = $headers
        }
        if ($null -ne $Body) {
            $invokeParams["Body"] = ($Body | ConvertTo-Json -Depth 20)
            $invokeParams["ContentType"] = "application/json"
        }

        $value = Invoke-RestMethod @invokeParams
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

function Convert-ApiResultSummary {
    param([Parameter(Mandatory = $true)][object]$Result)

    [ordered]@{
        ok = $Result.ok
        statusCode = $Result.statusCode
        error = $Result.error
    }
}

function Get-OptionalProperty {
    param(
        [object]$Object,
        [Parameter(Mandatory = $true)][string]$Name,
        [object]$Fallback = $null
    )

    if ($null -eq $Object) {
        return $Fallback
    }

    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $Fallback
    }

    return $property.Value
}

$repoResult = Invoke-GitHubJson -Method Get -Uri $apiRoot
$releaseResult = Invoke-GitHubJson -Method Get -Uri "$apiRoot/releases/tags/$LatestRelease"
$branchResult = Invoke-GitHubJson -Method Get -Uri "$apiRoot/branches/$DefaultBranch"
$protectionResult = Invoke-GitHubJson -Method Get -Uri "$apiRoot/branches/$DefaultBranch/protection"

$releaseStatus = if ($releaseResult.ok) {
    "visible"
} elseif ($releaseResult.statusCode -eq 404) {
    "missing"
} elseif ($releaseResult.statusCode -in @(401, 403, 429)) {
    "unavailable"
} else {
    "unknown"
}

if ($Apply) {
    if (-not $hasToken) {
        throw "GITHUB_TOKEN or REPO_GOVERNANCE_TOKEN is required for -Apply. Set a short-lived owner token in the current shell; never commit it."
    }

    if (-not $BranchProtectionOnly) {
        $metadataApply = Invoke-GitHubJson -Method Patch -Uri $apiRoot -Body $repoPayload
        if (-not $metadataApply.ok) {
            throw "Repository metadata update failed: $($metadataApply.error)"
        }

        $topicsApply = Invoke-GitHubJson -Method Put -Uri "$apiRoot/topics" -Body $topicsPayload
        if (-not $topicsApply.ok) {
            throw "Repository topics update failed: $($topicsApply.error)"
        }
    }

    if (-not $MetadataOnly) {
        $branchProtectionApply = Invoke-GitHubJson -Method Put -Uri "$apiRoot/branches/$DefaultBranch/protection" -Body $branchProtectionPayload
        if (-not $branchProtectionApply.ok) {
            throw "Branch protection update failed. Confirm the token has repository administration permission. Error: $($branchProtectionApply.error)"
        }
    }

    $repoResult = Invoke-GitHubJson -Method Get -Uri $apiRoot
    $branchResult = Invoke-GitHubJson -Method Get -Uri "$apiRoot/branches/$DefaultBranch"
    $protectionResult = Invoke-GitHubJson -Method Get -Uri "$apiRoot/branches/$DefaultBranch/protection"
}

$current = [ordered]@{
    description = if ($repoResult.ok) { $repoResult.value.description } else { $null }
    homepage = if ($repoResult.ok) { $repoResult.value.homepage } else { $null }
    topics = if ($repoResult.ok -and $repoResult.value.topics) { @($repoResult.value.topics) } else { @() }
    defaultBranch = if ($repoResult.ok) { $repoResult.value.default_branch } else { $null }
    visibility = if ($repoResult.ok) { $repoResult.value.visibility } else { $null }
    hasWiki = if ($repoResult.ok) { Get-OptionalProperty -Object $repoResult.value -Name "has_wiki" } else { $null }
    allowSquashMerge = if ($repoResult.ok) { Get-OptionalProperty -Object $repoResult.value -Name "allow_squash_merge" } else { $null }
    allowMergeCommit = if ($repoResult.ok) { Get-OptionalProperty -Object $repoResult.value -Name "allow_merge_commit" } else { $null }
    allowRebaseMerge = if ($repoResult.ok) { Get-OptionalProperty -Object $repoResult.value -Name "allow_rebase_merge" } else { $null }
    deleteBranchOnMerge = if ($repoResult.ok) { Get-OptionalProperty -Object $repoResult.value -Name "delete_branch_on_merge" } else { $null }
    latestReleaseStatus = $releaseStatus
    latestReleaseVisible = if ($releaseResult.ok) { $true } else { $null }
    branchProtected = if ($branchResult.ok) { [bool]$branchResult.value.protected } else { $false }
    branchProtectionReadable = $protectionResult.ok
}

$summary = [ordered]@{
    generatedAt = (Get-Date).ToString("o")
    repository = "$Owner/$Repo"
    mode = if ($Apply) {
        if ($MetadataOnly) { "apply-metadata" } elseif ($BranchProtectionOnly) { "apply-branch-protection" } else { "apply-all" }
    } else {
        "dry-run"
    }
    hasToken = $hasToken
    target = [ordered]@{
        description = $Description
        homepage = $Homepage
        topics = $Topics
        defaultBranch = $DefaultBranch
        latestRelease = $LatestRelease
        branchProtection = $branchProtectionPayload
    }
    current = $current
    api = [ordered]@{
        repository = Convert-ApiResultSummary -Result $repoResult
        release = Convert-ApiResultSummary -Result $releaseResult
        branch = Convert-ApiResultSummary -Result $branchResult
        branchProtection = Convert-ApiResultSummary -Result $protectionResult
    }
    ownerActions = @(
        if (-not $current.description) { "Fill GitHub About description." }
        if (-not $current.homepage) { "Fill GitHub homepage." }
        if (@($current.topics).Count -eq 0) { "Add repository topics." }
        if (-not $current.branchProtected) { "Enable branch protection for $DefaultBranch." }
        if ($current.latestReleaseStatus -eq "missing") { "Confirm $LatestRelease release is public." }
        if ($current.latestReleaseStatus -eq "unknown") { "Check $LatestRelease release visibility manually." }
        if ($current.hasWiki -eq $true) { "Disable the repository wiki to avoid an empty public surface." }
        if ($current.allowMergeCommit -eq $true) { "Disable merge commits so protected releases use squash/rebase history." }
        if ($current.deleteBranchOnMerge -eq $false) { "Enable automatic branch deletion after merge." }
    )
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $outputRoot "github-governance-$stamp.json"
$mdPath = Join-Path $outputRoot "github-governance-$stamp.md"
$summary | ConvertTo-Json -Depth 20 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# GitHub Governance Dry Run")
$lines.Add("")
$lines.Add("- Generated: $($summary.generatedAt)")
$lines.Add("- Repository: $Owner/$Repo")
$lines.Add("- Mode: $($summary.mode)")
$lines.Add("- Token present: $hasToken")
$lines.Add("- Latest release status: $($current.latestReleaseStatus)")
$lines.Add("- Branch protected: $($current.branchProtected)")
$lines.Add("- Branch protection readable: $($current.branchProtectionReadable)")
$lines.Add("")
$lines.Add("## Target Metadata")
$lines.Add("")
$lines.Add("- Description: $Description")
$lines.Add("- Homepage: $Homepage")
$lines.Add("- Topics: $($Topics -join ', ')")
$lines.Add("- Required checks: $($RequiredChecks -join ', ')")
$lines.Add("- Required check audit: run `scripts/github-check-contexts.ps1` before applying branch protection.")
$lines.Add("")
$lines.Add("## Current Public Metadata")
$lines.Add("")
$lines.Add("- Description: $($current.description)")
$lines.Add("- Homepage: $($current.homepage)")
$lines.Add("- Topics: $(@($current.topics) -join ', ')")
$lines.Add("- Default branch: $($current.defaultBranch)")
$lines.Add("- Visibility: $($current.visibility)")
$lines.Add("- Wiki enabled: $($current.hasWiki)")
$lines.Add("- Merge commits allowed: $($current.allowMergeCommit)")
$lines.Add("- Delete branch on merge: $($current.deleteBranchOnMerge)")
$lines.Add("")
$lines.Add("## Owner Actions")
$lines.Add("")
if (@($summary.ownerActions).Count -eq 0) {
    $lines.Add("None. Public metadata and release checks match the target state.")
} else {
    foreach ($action in $summary.ownerActions) {
        $lines.Add("- $action")
    }
}
$lines | Set-Content -Path $mdPath -Encoding UTF8

Write-Host "GitHub governance summary:"
Write-Host ("  repository            : {0}/{1}" -f $Owner, $Repo)
Write-Host ("  mode                  : {0}" -f $summary.mode)
Write-Host ("  token present          : {0}" -f $hasToken)
Write-Host ("  release {0} status     : {1}" -f $LatestRelease, $current.latestReleaseStatus)
Write-Host ("  branch protected       : {0}" -f $current.branchProtected)
Write-Host ("  description current    : {0}" -f ($(if ($current.description) { "set" } else { "empty" })))
Write-Host ("  homepage current       : {0}" -f ($(if ($current.homepage) { "set" } else { "empty" })))
Write-Host ("  topics current         : {0}" -f @($current.topics).Count)
Write-Host ""
Write-Host "Reports:"
Write-Host "  $jsonPath"
Write-Host "  $mdPath"

if ($DryRun) {
    Write-Host ""
    Write-Host "Dry run only. Re-run with -Apply -MetadataOnly and GITHUB_TOKEN or REPO_GOVERNANCE_TOKEN to fix the GitHub About/Homepage/Topics sidebar first."
    Write-Host "Then run scripts/github-check-contexts.ps1 and -Apply -BranchProtectionOnly when you are ready to enforce required checks on $DefaultBranch."
}
