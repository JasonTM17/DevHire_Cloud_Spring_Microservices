[CmdletBinding()]
param(
    [string]$Owner = "JasonTM17",
    [string]$Repo = "DevHire_Cloud_Spring_Microservices",
    [int[]]$PullRequests = @(43, 46, 47, 48, 49),
    [string]$OutputDir = "reports/pr-stack-status"
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

$ghCommand = Get-Command gh -ErrorAction SilentlyContinue
if ($null -eq $ghCommand) {
    throw "GitHub CLI is required for PR stack status. Install gh or run this from an environment with gh available."
}

function Get-PrStatus {
    param([Parameter(Mandatory = $true)][int]$Number)

    $json = & gh pr view $Number --repo "$Owner/$Repo" --json number,title,state,isDraft,headRefName,baseRefName,mergeStateStatus,reviewDecision,url,autoMergeRequest,updatedAt,statusCheckRollup 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to read PR #$Number`: $($json | Out-String)"
    }

    $pr = $json | ConvertFrom-Json
    $checks = @($pr.statusCheckRollup)
    $blockingChecks = @($checks | Where-Object {
        $status = if ($_.status) { [string]$_.status } else { "" }
        $conclusion = if ($_.conclusion) { [string]$_.conclusion } else { "" }
        -not ($status -eq "COMPLETED" -and ($conclusion -eq "SUCCESS" -or $conclusion -eq "SKIPPED"))
    })
    $successfulChecks = @($checks | Where-Object {
        $_.status -eq "COMPLETED" -and ($_.conclusion -eq "SUCCESS" -or $_.conclusion -eq "SKIPPED")
    })
    $autoMergeEnabled = $false
    if ($null -ne $pr.autoMergeRequest) {
        $autoMergeEnabled = $true
    }

    $blocker = ""
    if ($pr.reviewDecision -eq "REVIEW_REQUIRED") {
        $blocker = "review_required"
    } elseif ($pr.mergeStateStatus -notin @("CLEAN", "HAS_HOOKS", "UNKNOWN") -and $pr.state -eq "OPEN") {
        $blocker = "merge_state_$($pr.mergeStateStatus)"
    } elseif ($blockingChecks.Count -gt 0) {
        $blocker = "checks_not_green"
    } else {
        $blocker = "none"
    }

    [pscustomobject]@{
        number = [int]$pr.number
        title = [string]$pr.title
        state = [string]$pr.state
        base = [string]$pr.baseRefName
        head = [string]$pr.headRefName
        mergeState = [string]$pr.mergeStateStatus
        reviewDecision = if ($pr.reviewDecision) { [string]$pr.reviewDecision } else { "none" }
        autoMergeEnabled = $autoMergeEnabled
        checksTotal = $checks.Count
        checksGreenOrSkipped = $successfulChecks.Count
        blockingChecks = $blockingChecks.Count
        blocker = $blocker
        url = [string]$pr.url
        updatedAt = [string]$pr.updatedAt
    }
}

$rows = [System.Collections.Generic.List[object]]::new()
foreach ($number in $PullRequests) {
    $rows.Add((Get-PrStatus -Number $number))
}

$openRows = @($rows | Where-Object { $_.state -eq "OPEN" })
$blockingRows = @($openRows | Where-Object { $_.blocker -ne "none" })
$rootBlocker = @($rows | Where-Object { $_.number -eq 43 -and $_.blocker -eq "review_required" })
$nonRootBlocking = @($blockingRows | Where-Object { $_.number -ne 43 })

$status = if ($openRows.Count -eq 0) {
    "merged"
} elseif ($rootBlocker.Count -eq 1 -and $nonRootBlocking.Count -eq 0) {
    "ready_after_root_review"
} elseif ($blockingRows.Count -eq 0) {
    "ready"
} else {
    "blocked"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $outputRoot "pr-stack-status-$stamp.json"
$mdPath = Join-Path $outputRoot "pr-stack-status-$stamp.md"

$summary = [ordered]@{
    generatedAt = (Get-Date).ToString("o")
    repository = "$Owner/$Repo"
    status = $status
    pullRequests = @($rows)
    blockers = @($blockingRows)
    mergeOrder = @(
        "Approve and merge PR #43 into master through protected review.",
        "Retarget PR #46 to master, wait for checks, then merge through review.",
        "Retarget PR #47 to master, wait for checks, then merge through review.",
        "Retarget PR #48 to master, wait for checks, then merge through review.",
        "Retarget PR #49 to master, wait for checks, then merge through review."
    )
}
$summary | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# DevHire v0.6 PR Stack Status")
$lines.Add("")
$lines.Add("- Repository: $Owner/$Repo")
$lines.Add("- Generated: $($summary.generatedAt)")
$lines.Add("- Status: $status")
$lines.Add("")
$lines.Add("| PR | Base | Head | Merge | Review | Checks | Blocker |")
$lines.Add("|---:|---|---|---|---|---:|---|")
foreach ($row in $rows) {
    $checks = "$($row.checksGreenOrSkipped)/$($row.checksTotal)"
    $lines.Add("| [#$($row.number)]($($row.url)) | `$($row.base)` | `$($row.head)` | $($row.mergeState) | $($row.reviewDecision) | $checks | $($row.blocker) |")
}
$lines.Add("")
$lines.Add("## Merge Order")
$lines.Add("")
foreach ($step in $summary.mergeOrder) {
    $lines.Add("- $step")
}
$lines.Add("")
$lines.Add("Protected branch policy stays intact: no direct push to `master`, no admin bypass, and no weakening required reviews.")
$lines | Set-Content -Path $mdPath -Encoding UTF8

Write-Host "PR stack status:"
Write-Host ("  repository : {0}/{1}" -f $Owner, $Repo)
Write-Host ("  status     : {0}" -f $status)
Write-Host ("  PRs        : {0}" -f (($rows | ForEach-Object { "#$($_.number)=$($_.blocker)" }) -join ", "))
Write-Host ""
Write-Host "Reports:"
Write-Host "  $jsonPath"
Write-Host "  $mdPath"

if ($status -eq "blocked" -and $blockingRows.Count -gt 0) {
    $details = ($blockingRows | ForEach-Object { "#$($_.number):$($_.blocker)" }) -join ", "
    throw "PR stack has blockers beyond the expected root review gate: $details"
}
