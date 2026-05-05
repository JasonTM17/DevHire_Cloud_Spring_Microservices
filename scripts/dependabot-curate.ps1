[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Apply,
    [switch]$CloseDeferred,
    [switch]$DeleteClosedBranches,

    [string]$Owner = "JasonTM17",
    [string]$Repo = "DevHire_Cloud_Spring_Microservices",
    [string]$OutputDir = "reports/dependabot-curate"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $DryRun -and -not $Apply) {
    $DryRun = $true
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
    "User-Agent" = "DevHire-Dependabot-Curate"
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

if ($Apply -and -not $hasToken) {
    throw "GITHUB_TOKEN is required for -Apply. Set a short-lived token in the current shell; never commit it."
}

$labelCatalog = @{
    "safe-batch" = @{
        color = "2da44e"
        description = "Low-risk dependency update that can be reviewed in a curated batch."
    }
    "deferred-major" = @{
        color = "d1242f"
        description = "Major or platform update deferred to a dedicated migration pass."
    }
    "needs-runtime-smoke" = @{
        color = "fbca04"
        description = "Requires Docker/runtime smoke before merge."
    }
    "portfolio-maintenance" = @{
        color = "0969da"
        description = "Repository hygiene and portfolio maintenance work."
    }
}

function Invoke-GitHubJson {
    param(
        [Parameter(Mandatory = $true)][ValidateSet("Get", "Patch", "Post", "Delete")][string]$Method,
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

function Get-Category {
    param([Parameter(Mandatory = $true)][string]$Title)

    if ($Title -match "github_actions|actions group|actions/") { return "github-actions" }
    if ($Title -match "terraform|hashicorp/aws") { return "terraform" }
    if ($Title -match "@playwright|@types|next|react|typescript|npm|frontend|node from") { return "npm" }
    if ($Title -match "docker|base-images|maven, eclipse-temurin|eclipse-temurin") { return "docker" }
    if ($Title -match "spring|jjwt|testcontainers|springdoc|maven|org\\.") { return "maven" }
    return "other"
}

function Get-CurationPlan {
    param([Parameter(Mandatory = $true)][object]$PullRequest)

    $title = [string]$PullRequest.title
    $category = Get-Category -Title $title
    $labels = @("portfolio-maintenance")
    $decision = "manual-review"
    $action = "review after normal CI"
    $reason = "No high-risk pattern matched."

    if ($title -match "hashicorp/aws|~> 6\.| to 25\.|@types/node.*25|testcontainers.*2\.|springdoc.*3\.|spring-platform|Spring Boot|Spring Cloud|jjwt.*0\.13") {
        $decision = "defer-major"
        $action = if ($CloseDeferred) { "comment, label, and close" } else { "comment and label; keep open unless -CloseDeferred is used" }
        $reason = "Major platform or runtime dependency update needs a dedicated migration pass and runtime smoke."
        $labels += @("deferred-major", "needs-runtime-smoke")
    } elseif ($category -in @("github-actions", "docker")) {
        $decision = "safe-batch"
        $action = "label for curated safe batch; merge only after CI and smoke are green"
        $reason = "Patch/minor maintenance can be reviewed as a low-risk batch."
        $labels += @("safe-batch", "needs-runtime-smoke")
    } elseif ($title -match "@playwright") {
        $decision = "safe-batch"
        $action = "label for frontend tooling batch; run Playwright smoke before merge"
        $reason = "Playwright tooling update is usually safe but still needs browser smoke."
        $labels += @("safe-batch", "needs-runtime-smoke")
    } elseif ($category -eq "npm") {
        $decision = "manual-review"
        $action = "label for frontend review; defer major runtime updates"
        $reason = "Frontend dependency update should pass typecheck, build, and E2E before merge."
        $labels += @("needs-runtime-smoke")
    }

    [pscustomobject]@{
        number = $PullRequest.number
        title = $title
        category = $category
        decision = $decision
        action = $action
        reason = $reason
        labels = @($labels | Select-Object -Unique)
        url = $PullRequest.html_url
    }
}

function Ensure-Label {
    param(
        [Parameter(Mandatory = $true)][string]$Name
    )

    $definition = $labelCatalog[$Name]
    $payload = @{
        name = $Name
        color = $definition.color
        description = $definition.description
    }
    $result = Invoke-GitHubJson -Method Post -Uri "$apiRoot/labels" -Body $payload
    if (-not $result.ok -and $result.statusCode -ne 422) {
        throw "Failed to ensure label $Name`: $($result.error)"
    }
}

function Add-CurationComment {
    param([Parameter(Mandatory = $true)][object]$Plan)

    $body = @"
DevHire dependency curation v0.4.4

Decision: $($Plan.decision)
Action: $($Plan.action)
Reason: $($Plan.reason)

This repository does not auto-merge Dependabot updates. Safe batches still need green CI and runtime smoke. Major/runtime platform updates are handled in dedicated migration passes.
"@

    $comments = Invoke-GitHubJson -Method Get -Uri "$apiRoot/issues/$($Plan.number)/comments?per_page=100"
    if ($comments.ok) {
        $alreadyCommented = @($comments.value | Where-Object { $_.body -match "DevHire dependency curation v0\.4\.4" }).Count -gt 0
        if ($alreadyCommented) {
            return
        }
    }

    $result = Invoke-GitHubJson -Method Post -Uri "$apiRoot/issues/$($Plan.number)/comments" -Body @{ body = $body }
    if (-not $result.ok) {
        throw "Failed to comment on PR #$($Plan.number): $($result.error)"
    }
}

$searchUri = "https://api.github.com/search/issues?q=repo:$Owner/$Repo+is:pr+is:open+author:app/dependabot&per_page=100"
$searchResult = Invoke-GitHubJson -Method Get -Uri $searchUri
if (-not $searchResult.ok) {
    throw "Failed to read Dependabot PRs: $($searchResult.error)"
}

$plans = @($searchResult.value.items | ForEach-Object { Get-CurationPlan -PullRequest $_ })

$closedBranchDeletion = @()

if ($Apply) {
    foreach ($label in $labelCatalog.Keys) {
        Ensure-Label -Name $label
    }

    foreach ($plan in $plans) {
        $labelResult = Invoke-GitHubJson -Method Post -Uri "$apiRoot/issues/$($plan.number)/labels" -Body @{ labels = @($plan.labels) }
        if (-not $labelResult.ok) {
            throw "Failed to label PR #$($plan.number): $($labelResult.error)"
        }

        Add-CurationComment -Plan $plan

        if ($CloseDeferred -and $plan.decision -eq "defer-major") {
            $closeResult = Invoke-GitHubJson -Method Patch -Uri "$apiRoot/issues/$($plan.number)" -Body @{ state = "closed" }
            if (-not $closeResult.ok) {
                throw "Failed to close deferred PR #$($plan.number): $($closeResult.error)"
            }

            if ($DeleteClosedBranches) {
                $pullResult = Invoke-GitHubJson -Method Get -Uri "$apiRoot/pulls/$($plan.number)"
                if ($pullResult.ok -and $pullResult.value.head.repo.full_name -eq "$Owner/$Repo") {
                    $encodedRef = [uri]::EscapeDataString("heads/$($pullResult.value.head.ref)")
                    $deleteResult = Invoke-GitHubJson -Method Delete -Uri "$apiRoot/git/refs/$encodedRef"
                    $closedBranchDeletion += [pscustomobject]@{
                        number = $plan.number
                        branch = $pullResult.value.head.ref
                        ok = $deleteResult.ok
                        error = $deleteResult.error
                    }
                    if (-not $deleteResult.ok) {
                        throw "Failed to delete branch for PR #$($plan.number): $($deleteResult.error)"
                    }
                }
            }
        }
    }
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $outputRoot "dependabot-curation-$stamp.json"
$mdPath = Join-Path $outputRoot "dependabot-curation-$stamp.md"

$summary = [ordered]@{
    generatedAt = (Get-Date).ToString("o")
    repository = "$Owner/$Repo"
    mode = if ($Apply) { "apply" } else { "dry-run" }
    hasToken = $hasToken
    closeDeferred = [bool]$CloseDeferred
    deleteClosedBranches = [bool]$DeleteClosedBranches
    openDependabotPullRequests = $plans.Count
    plans = $plans
    closedBranchDeletion = @($closedBranchDeletion)
}
$summary | ConvertTo-Json -Depth 20 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# Dependabot Curation")
$lines.Add("")
$lines.Add("- Generated: $($summary.generatedAt)")
$lines.Add("- Repository: $Owner/$Repo")
$lines.Add("- Mode: $($summary.mode)")
$lines.Add("- Token present: $hasToken")
$lines.Add("- Open Dependabot PRs: $($plans.Count)")
$lines.Add("- Close deferred enabled: $CloseDeferred")
$lines.Add("- Delete closed branches enabled: $DeleteClosedBranches")
$lines.Add("")
$lines.Add("| PR | Category | Decision | Labels | Action |")
$lines.Add("|---:|---|---|---|---|")
foreach ($plan in $plans | Sort-Object category, decision, number) {
    $safeTitle = $plan.title -replace "\|", "/"
    $lines.Add("| [#$($plan.number)]($($plan.url)) | $($plan.category) | $($plan.decision) | $($plan.labels -join ', ') | $($plan.action) - $safeTitle |")
}
$lines.Add("")
$lines.Add("## Policy")
$lines.Add("")
$lines.Add("- No automatic merge is performed by this script.")
$lines.Add("- Safe batches still require green CI and runtime smoke.")
$lines.Add("- Deferred major updates are closed only when `-Apply -CloseDeferred` is explicitly used with an owner token.")
$lines.Add("- Dependabot branches are deleted only when `-Apply -CloseDeferred -DeleteClosedBranches` is explicitly used and the branch belongs to this repository.")
$lines | Set-Content -Path $mdPath -Encoding UTF8

Write-Host "Dependabot curation summary:"
Write-Host ("  repository       : {0}/{1}" -f $Owner, $Repo)
Write-Host ("  mode             : {0}" -f $summary.mode)
Write-Host ("  token present     : {0}" -f $hasToken)
Write-Host ("  open PRs          : {0}" -f $plans.Count)
$plans | Group-Object decision | Sort-Object Name | ForEach-Object {
    Write-Host ("  {0,-16}: {1}" -f $_.Name, $_.Count)
}
Write-Host ""
Write-Host "Reports:"
Write-Host "  $jsonPath"
Write-Host "  $mdPath"

if ($DryRun) {
    Write-Host ""
    Write-Host "Dry run only. Re-run with -Apply to label/comment, -Apply -CloseDeferred to close deferred major PRs, or -Apply -CloseDeferred -DeleteClosedBranches to delete those Dependabot branches."
}
