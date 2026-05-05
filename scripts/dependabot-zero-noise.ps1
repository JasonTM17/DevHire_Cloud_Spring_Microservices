[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Apply,

    [string]$Owner = "JasonTM17",
    [string]$Repo = "DevHire_Cloud_Spring_Microservices",
    [string]$OutputDir = "reports/dependabot-zero-noise"
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

$token = if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_TOKEN)) {
    $env:GITHUB_TOKEN
} elseif (-not [string]::IsNullOrWhiteSpace($env:REPO_GOVERNANCE_TOKEN)) {
    $env:REPO_GOVERNANCE_TOKEN
} else {
    $null
}
$hasToken = -not [string]::IsNullOrWhiteSpace($token)
if ($Apply -and -not $hasToken) {
    throw "GITHUB_TOKEN or REPO_GOVERNANCE_TOKEN is required for -Apply. Set a short-lived owner token in the current shell; never commit it."
}

$apiRoot = "https://api.github.com/repos/$Owner/$Repo"
$headers = @{
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent" = "DevHire-Dependabot-Zero-Noise"
}
if ($hasToken) {
    $headers["Authorization"] = "Bearer $token"
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
        [Parameter(Mandatory = $true)][ValidateSet("Get", "Patch", "Post", "Put")][string]$Method,
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
        [pscustomobject]@{
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
        [pscustomobject]@{
            ok = $false
            statusCode = $statusCode
            value = $null
            error = $_.Exception.Message
        }
    }
}

function Ensure-Label {
    param([Parameter(Mandatory = $true)][string]$Name)

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

function Get-Category {
    param([Parameter(Mandatory = $true)][string]$Title)

    if ($Title -match "github_actions|actions group|actions/") { return "github-actions" }
    if ($Title -match "node from .* to 25|@types/node.*25|runtime-major") { return "runtime-major" }
    if ($Title -match "terraform|hashicorp/aws") { return "terraform" }
    if ($Title -match "@playwright|@types|next|react|typescript|npm|frontend|node from") { return "npm" }
    if ($Title -match "docker|base-images|maven, eclipse-temurin|eclipse-temurin") { return "docker" }
    if ($Title -match "spring|jjwt|testcontainers|springdoc|maven|org\\.") { return "maven" }
    return "other"
}

function Get-Classification {
    param([Parameter(Mandatory = $true)][string]$Title)

    if ($Title -match "hashicorp/aws|~> 6\.|node from .* to 25|@types/node.*25|testcontainers.*2\.|springdoc.*3\.|spring-platform|Spring Boot|Spring Cloud|jjwt.*0\.13") {
        return "manual-review"
    }
    return "safe-batch"
}

function Get-PullDetails {
    param([Parameter(Mandatory = $true)][int]$Number)

    $pullResult = Invoke-GitHubJson -Method Get -Uri "$apiRoot/pulls/$Number"
    if ($pullResult.ok -and [string]::IsNullOrWhiteSpace([string]$pullResult.value.mergeable_state)) {
        Start-Sleep -Seconds 2
        $pullResult = Invoke-GitHubJson -Method Get -Uri "$apiRoot/pulls/$Number"
    }
    return $pullResult
}

function Get-CheckSummary {
    param([Parameter(Mandatory = $true)][string]$Sha)

    $checksResult = Invoke-GitHubJson -Method Get -Uri "$apiRoot/commits/$Sha/check-runs?per_page=100"
    if (-not $checksResult.ok) {
        return [pscustomobject]@{
            readable = $false
            total = 0
            completed = 0
            green = $false
            blocking = @()
            error = $checksResult.error
        }
    }

    $runs = @($checksResult.value.check_runs)
    $blocking = @($runs | Where-Object {
        $_.status -ne "completed" -or ($_.conclusion -notin @("success", "neutral", "skipped"))
    } | ForEach-Object {
        [pscustomobject]@{
            name = $_.name
            status = $_.status
            conclusion = $_.conclusion
        }
    })

    [pscustomobject]@{
        readable = $true
        total = $runs.Count
        completed = @($runs | Where-Object { $_.status -eq "completed" }).Count
        green = ($runs.Count -gt 0 -and $blocking.Count -eq 0)
        blocking = @($blocking)
        error = $null
    }
}

function New-Plan {
    param([Parameter(Mandatory = $true)][object]$Issue)

    $number = [int]$Issue.number
    $title = [string]$Issue.title
    $classification = Get-Classification -Title $title
    $category = Get-Category -Title $title
    $pullResult = Get-PullDetails -Number $number

    $headSha = $null
    $mergeableState = "unknown"
    $checks = [pscustomobject]@{
        readable = $false
        total = 0
        completed = 0
        green = $false
        blocking = @()
        error = "pull request details unavailable"
    }

    if ($pullResult.ok) {
        $headSha = [string]$pullResult.value.head.sha
        $mergeableState = [string]$pullResult.value.mergeable_state
        if (-not [string]::IsNullOrWhiteSpace($headSha)) {
            $checks = Get-CheckSummary -Sha $headSha
        }
    }

    $action = "close-defer"
    $reason = "Deferred to the scheduled dependency refresh because required check status or mergeability is not clean."
    if ($classification -eq "manual-review") {
        $action = "close-manual-review"
        $reason = "Runtime or platform major update requires a dedicated migration pass and runtime smoke."
    } elseif ($mergeableState -eq "clean" -and $checks.readable -and $checks.green) {
        $action = "merge-squash"
        $reason = "Safe-batch PR is clean and all readable checks are green."
    } elseif (-not $checks.readable) {
        $reason = "Check status is not readable; zero-noise policy does not auto-merge unreadable PRs."
    } elseif (-not $checks.green) {
        $reason = "One or more checks are pending or failing; defer to scheduled dependency refresh."
    } elseif ($mergeableState -ne "clean") {
        $reason = "GitHub mergeable_state is '$mergeableState', not 'clean'."
    }

    [pscustomobject]@{
        number = $number
        title = $title
        url = [string]$Issue.html_url
        category = $category
        classification = $classification
        action = $action
        reason = $reason
        headSha = $headSha
        mergeableState = $mergeableState
        checkReadable = [bool]$checks.readable
        checkTotal = [int]$checks.total
        checkGreen = [bool]$checks.green
        blockingChecks = @($checks.blocking)
    }
}

function Add-Comment {
    param(
        [Parameter(Mandatory = $true)][int]$Number,
        [Parameter(Mandatory = $true)][string]$Body
    )

    $result = Invoke-GitHubJson -Method Post -Uri "$apiRoot/issues/$Number/comments" -Body @{ body = $Body }
    if (-not $result.ok) {
        throw "Failed to comment on PR #$Number`: $($result.error)"
    }
}

function Add-Labels {
    param(
        [Parameter(Mandatory = $true)][int]$Number,
        [Parameter(Mandatory = $true)][string[]]$Labels
    )

    $result = Invoke-GitHubJson -Method Post -Uri "$apiRoot/issues/$Number/labels" -Body @{ labels = $Labels }
    if (-not $result.ok) {
        throw "Failed to label PR #$Number`: $($result.error)"
    }
}

function Close-Pr {
    param([Parameter(Mandatory = $true)][int]$Number)

    $result = Invoke-GitHubJson -Method Patch -Uri "$apiRoot/issues/$Number" -Body @{ state = "closed" }
    if (-not $result.ok) {
        throw "Failed to close PR #$Number`: $($result.error)"
    }
}

function Merge-Pr {
    param([Parameter(Mandatory = $true)][object]$Plan)

    $payload = @{
        commit_title = "chore(deps): merge safe Dependabot PR #$($Plan.number)"
        commit_message = "Squash-merged by DevHire zero-noise dependency curation after clean mergeability and green readable checks."
        merge_method = "squash"
    }
    $result = Invoke-GitHubJson -Method Put -Uri "$apiRoot/pulls/$($Plan.number)/merge" -Body $payload
    if (-not $result.ok) {
        return $result
    }
    return $result
}

$pullsResult = Invoke-GitHubJson -Method Get -Uri "$apiRoot/pulls?state=open&per_page=100"
if (-not $pullsResult.ok) {
    throw "Failed to read open pull requests: $($pullsResult.error)"
}

$dependabotPulls = @($pullsResult.value | Where-Object {
    $_.user.login -eq "dependabot[bot]" -or $_.user.login -eq "app/dependabot" -or $_.user.login -like "dependabot*"
})
$plans = @($dependabotPulls | ForEach-Object { New-Plan -Issue $_ } | Sort-Object classification, category, number)
$applyResults = [System.Collections.Generic.List[object]]::new()

if ($Apply) {
    foreach ($label in $labelCatalog.Keys) {
        Ensure-Label -Name $label
    }

    foreach ($plan in $plans) {
        $labels = @("portfolio-maintenance", "needs-runtime-smoke")
        if ($plan.classification -eq "safe-batch") {
            $labels += "safe-batch"
        } else {
            $labels += "deferred-major"
        }
        Add-Labels -Number $plan.number -Labels (@($labels | Select-Object -Unique))

        if ($plan.action -eq "merge-squash") {
            $comment = @"
DevHire zero-noise dependency curation

Decision: merge safe batch.
Reason: $($plan.reason)

This PR was classified as safe-batch, GitHub reported mergeable_state=clean, and all readable checks were green.
"@
            Add-Comment -Number $plan.number -Body $comment
            $mergeResult = Merge-Pr -Plan $plan
            if ($mergeResult.ok) {
                $applyResults.Add([pscustomobject]@{
                    number = $plan.number
                    action = "merged"
                    ok = $true
                    error = $null
                })
            } else {
                $fallbackComment = @"
DevHire zero-noise dependency curation

Decision: close and defer to scheduled dependency refresh.
Reason: safe merge was attempted but GitHub rejected the merge request: $($mergeResult.error)

The update is not lost; Dependabot will recreate or refresh it in the scheduled dependency maintenance window.
"@
                Add-Comment -Number $plan.number -Body $fallbackComment
                Close-Pr -Number $plan.number
                $applyResults.Add([pscustomobject]@{
                    number = $plan.number
                    action = "closed-after-merge-rejection"
                    ok = $true
                    error = $mergeResult.error
                })
            }
        } else {
            $comment = @"
DevHire zero-noise dependency curation

Decision: close and defer.
Reason: $($plan.reason)

Policy: safe PRs are squash-merged only when required check status is readable, green, and mergeable_state=clean. Pending, failing, conflicted, unreadable, or runtime-major updates are deferred to the scheduled dependency refresh so the public queue stays intentional.
"@
            Add-Comment -Number $plan.number -Body $comment
            Close-Pr -Number $plan.number
            $applyResults.Add([pscustomobject]@{
                number = $plan.number
                action = "closed"
                ok = $true
                error = $null
            })
        }
    }
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $outputRoot "dependabot-zero-noise-$stamp.json"
$mdPath = Join-Path $outputRoot "dependabot-zero-noise-$stamp.md"

$summary = [ordered]@{
    generatedAt = (Get-Date).ToString("o")
    repository = "$Owner/$Repo"
    mode = if ($Apply) { "apply" } else { "dry-run" }
    hasToken = $hasToken
    openDependabotPullRequests = $plans.Count
    mergeCandidates = @($plans | Where-Object { $_.action -eq "merge-squash" }).Count
    closeCandidates = @($plans | Where-Object { $_.action -ne "merge-squash" }).Count
    plans = @($plans)
    applyResults = @($applyResults)
}
$summary | ConvertTo-Json -Depth 20 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# Dependabot Zero-Noise")
$lines.Add("")
$lines.Add("- Generated: $($summary.generatedAt)")
$lines.Add("- Repository: $Owner/$Repo")
$lines.Add("- Mode: $($summary.mode)")
$lines.Add("- Token present: $hasToken")
$lines.Add("- Open Dependabot PRs: $($plans.Count)")
$lines.Add("- Merge candidates: $($summary.mergeCandidates)")
$lines.Add("- Close/defer candidates: $($summary.closeCandidates)")
$lines.Add("")
$lines.Add("| PR | Category | Classification | Mergeable | Checks | Action | Reason |")
$lines.Add("|---:|---|---|---|---|---|---|")
foreach ($plan in $plans) {
    $checkText = if ($plan.checkReadable) { "green=$($plan.checkGreen), total=$($plan.checkTotal)" } else { "unreadable" }
    $safeReason = $plan.reason.Replace("|", "/")
    $safeTitle = $plan.title.Replace("|", "/")
    $lines.Add("| [#$($plan.number)]($($plan.url)) | $($plan.category) | $($plan.classification) | $($plan.mergeableState) | $checkText | $($plan.action) | $safeReason - $safeTitle |")
}
$lines.Add("")
$lines.Add("## Policy")
$lines.Add("")
$lines.Add('- Safe PRs merge only when `mergeable_state=clean` and readable checks are green.')
$lines.Add("- Pending, failing, conflicted, unreadable, or runtime-major PRs close with a migration or scheduled-refresh comment.")
$lines.Add('- The script never prints or stores tokens; generated reports stay under ignored `reports/`.')
$lines | Set-Content -Path $mdPath -Encoding UTF8

Write-Host "Dependabot zero-noise summary:"
Write-Host ("  repository       : {0}/{1}" -f $Owner, $Repo)
Write-Host ("  mode             : {0}" -f $summary.mode)
Write-Host ("  token present     : {0}" -f $hasToken)
Write-Host ("  open PRs          : {0}" -f $plans.Count)
Write-Host ("  merge candidates  : {0}" -f $summary.mergeCandidates)
Write-Host ("  close candidates  : {0}" -f $summary.closeCandidates)
Write-Host ""
Write-Host "Reports:"
Write-Host "  $jsonPath"
Write-Host "  $mdPath"

if ($DryRun) {
    Write-Host ""
    Write-Host "Dry run only. Re-run with -Apply and an owner token to merge clean safe PRs and close/defer the rest."
}
