[CmdletBinding()]
param(
    [string]$Owner = "JasonTM17",
    [string]$Repo = "DevHire_Cloud_Spring_Microservices",
    [string]$DefaultBranch = "master",
    [string]$OutputDir = "reports/professionalism-audit"
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
    "User-Agent" = "DevHire-Professionalism-Audit"
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
    param([Parameter(Mandatory = $true)][string]$Uri)

    try {
        $value = Invoke-RestMethod -Method Get -Uri $Uri -Headers $headers
        return [pscustomobject]@{ ok = $true; value = $value; statusCode = 200; error = $null }
    } catch {
        $statusCode = $null
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        return [pscustomobject]@{ ok = $false; value = $null; statusCode = $statusCode; error = $_.Exception.Message }
    }
}

function Add-Check {
    param(
        [System.Collections.Generic.List[object]]$Checks,
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Status,
        [string]$Details = ""
    )

    $Checks.Add([pscustomobject]@{
        name = $Name
        status = $Status
        details = $Details
    })
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

function Test-PathSet {
    param([Parameter(Mandatory = $true)][string[]]$Paths)

    foreach ($path in $Paths) {
        [pscustomobject]@{
            path = $path
            exists = Test-Path (Join-Path $repoRoot $path)
        }
    }
}

Push-Location $repoRoot
try {
    $checks = [System.Collections.Generic.List[object]]::new()

    $repoResult = Invoke-GitHubJson -Uri $apiRoot
    $branchResult = Invoke-GitHubJson -Uri "$apiRoot/branches/$DefaultBranch"
    $runsResult = Invoke-GitHubJson -Uri "$apiRoot/actions/runs?branch=$DefaultBranch&per_page=50"
    $dependabotResult = Invoke-GitHubJson -Uri "https://api.github.com/search/issues?q=repo:$Owner/$Repo+is:pr+is:open+author:app/dependabot&per_page=100"

    $metadata = [ordered]@{
        descriptionSet = if ($repoResult.ok) { -not [string]::IsNullOrWhiteSpace($repoResult.value.description) } else { $false }
        homepageSet = if ($repoResult.ok) { -not [string]::IsNullOrWhiteSpace($repoResult.value.homepage) } else { $false }
        topicCount = if ($repoResult.ok -and $repoResult.value.topics) { @($repoResult.value.topics).Count } else { 0 }
        defaultBranch = if ($repoResult.ok) { $repoResult.value.default_branch } else { $null }
        visibility = if ($repoResult.ok) { $repoResult.value.visibility } else { $null }
        wikiEnabled = if ($repoResult.ok) { Get-OptionalProperty -Object $repoResult.value -Name "has_wiki" } else { $null }
        mergeCommitAllowed = if ($repoResult.ok) { Get-OptionalProperty -Object $repoResult.value -Name "allow_merge_commit" } else { $null }
        deleteBranchOnMerge = if ($repoResult.ok) { Get-OptionalProperty -Object $repoResult.value -Name "delete_branch_on_merge" } else { $null }
    }

    $branchProtected = if ($branchResult.ok) { [bool]$branchResult.value.protected } else { $false }
    $ownerActions = @()
    if (-not $metadata.descriptionSet) { $ownerActions += "Set repository About description" }
    if (-not $metadata.homepageSet) { $ownerActions += "Set repository homepage" }
    if ($metadata.topicCount -eq 0) { $ownerActions += "Add repository topics" }
    if (-not $branchProtected) { $ownerActions += "Protect $DefaultBranch branch" }
    if ($metadata.wikiEnabled -eq $true) { $ownerActions += "Disable empty repository wiki" }
    if ($metadata.mergeCommitAllowed -eq $true) { $ownerActions += "Disable merge commits for release hygiene" }
    if ($metadata.deleteBranchOnMerge -eq $false) { $ownerActions += "Enable delete branch on merge" }

    $metadataStatus = if ($ownerActions.Count -eq 0) { "passed" } else { "owner-action" }
    Add-Check -Checks $checks -Name "github public facade" -Status $metadataStatus -Details "$($ownerActions.Count) owner action(s)"

    $domainAuditStatus = "failed"
    $domainAuditDetails = ""
    try {
        $domainOutput = & (Join-Path $PSScriptRoot "domain-placeholder-audit.ps1") | Out-String
        $domainAuditStatus = "passed"
        $domainAuditDetails = ($domainOutput.Trim() -replace "\s+", " ")
    } catch {
        $domainAuditDetails = $_.Exception.Message
    }
    Add-Check -Checks $checks -Name "managed placeholder domains" -Status $domainAuditStatus -Details $domainAuditDetails

    $trackedFiles = @(git ls-files)
    if ($LASTEXITCODE -ne 0) {
        throw "git ls-files failed"
    }

    $forbiddenTracked = @(
        $trackedFiles | Where-Object {
            $_ -match "^reports/" -or
            $_ -match "^backups/" -or
            $_ -match "^\.stitch/" -or
            $_ -match "^\.env$" -or
            $_ -match "^\.env\.(local|smtp|claude|gmail)$" -or
            $_ -match "\.tfstate" -or
            $_ -match "\.tfplan$" -or
            $_ -match "node_modules/" -or
            $_ -match "/target/" -or
            $_ -match "\.log$" -or
            $_ -match "hs_err_pid|replay_pid"
        }
    )
    Add-Check -Checks $checks -Name "tracked artifact hygiene" -Status $(if ($forbiddenTracked.Count -eq 0) { "passed" } else { "failed" }) -Details "$($forbiddenTracked.Count) tracked artifact(s)"

    $localIgnoredArtifacts = @(
        ".env",
        "reports",
        ".stitch",
        "frontend/.next",
        "frontend/playwright-report",
        "frontend/test-results"
    ) | ForEach-Object {
        [pscustomobject]@{
            path = $_
            exists = Test-Path (Join-Path $repoRoot $_)
        }
    }
    Add-Check -Checks $checks -Name "ignored local artifact inventory" -Status "informational" -Details "$(@($localIgnoredArtifacts | Where-Object { $_.exists }).Count) local ignored artifact path(s) present"

    $requiredDocs = @(
        "README.md",
        "docs/professional-review-map.md",
        "docs/production-engineering-scorecard.md",
        "docs/repository-health.md",
        "docs/github-governance.md",
        "docs/security-evidence.md",
        "docs/cloud-readiness-review.md",
        "docs/runtime-evidence-v0.4.md",
        "docs/release-evidence/v0.4.0.md"
    )
    $requiredScripts = @(
        "scripts/portfolio-verify.ps1",
        "scripts/repository-health.ps1",
        "scripts/github-governance.ps1",
        "scripts/domain-placeholder-audit.ps1",
        "scripts/professionalism-audit.ps1",
        "scripts/pr-stack-status.ps1",
        "scripts/dependabot-zero-noise.ps1",
        "scripts/github-workflow-status.ps1",
        "scripts/repo-hygiene.ps1",
        "scripts/docs-quality.ps1",
        "scripts/evidence-audit.ps1"
    )
    $requiredWorkflows = @(
        ".github/workflows/ci.yml",
        ".github/workflows/docker.yml",
        ".github/workflows/docs.yml",
        ".github/workflows/security.yml",
        ".github/workflows/codeql.yml",
        ".github/workflows/repository-governance.yml"
    )

    $requiredEvidence = @(Test-PathSet -Paths ($requiredDocs + $requiredScripts + $requiredWorkflows))
    $missingRequired = @($requiredEvidence | Where-Object { -not $_.exists })
    Add-Check -Checks $checks -Name "required review evidence files" -Status $(if ($missingRequired.Count -eq 0) { "passed" } else { "failed" }) -Details "$($missingRequired.Count) missing file(s)"

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
                        url = $latest.html_url
                    }
                } |
                Sort-Object name
        )
    }

    $workflowNames = @($workflowRows | ForEach-Object { $_.name })
    $workflowEvidenceStatus = if (@("CI", "Docker Images", "Documentation", "Security", "CodeQL") | Where-Object { $_ -notin $workflowNames }) { "warning" } else { "passed" }
    Add-Check -Checks $checks -Name "public workflow evidence" -Status $workflowEvidenceStatus -Details "$($workflowRows.Count) latest workflow row(s) visible"

    $securityWorkflowPath = Join-Path $repoRoot ".github/workflows/security.yml"
    $securityWorkflow = Get-Content -Raw -Encoding UTF8 $securityWorkflowPath
    $imageScanGuardrails = [ordered]@{
        hasImageScan = $securityWorkflow -match "(?m)^\s*image-scan:"
        throttlesMatrix = $securityWorkflow -match "(?m)^\s*max-parallel:\s*2\s*$"
        usesPerServiceBuildCache = ($securityWorkflow -match "cache-from:\s*type=gha,scope=security-\$\{\{\s*matrix\.service\s*\}\}") -and
            ($securityWorkflow -match "cache-to:\s*type=gha,scope=security-\$\{\{\s*matrix\.service\s*\}\},mode=max")
        blocksHighCritical = ($securityWorkflow -match "severity:\s*HIGH,CRITICAL") -and
            ($securityWorkflow -match "exit-code:\s*`"1`"")
    }
    $missingImageScanGuardrails = @(
        $imageScanGuardrails.GetEnumerator() |
            Where-Object { -not $_.Value } |
            ForEach-Object { $_.Key }
    )
    Add-Check -Checks $checks -Name "security image scan reliability guardrails" -Status $(if ($missingImageScanGuardrails.Count -eq 0) { "passed" } else { "failed" }) -Details $(if ($missingImageScanGuardrails.Count -eq 0) { "matrix throttling, cache, and blocking severity are configured" } else { "missing: $($missingImageScanGuardrails -join ', ')" })

    $dependabotOpenCount = if ($dependabotResult.ok) { [int]$dependabotResult.value.total_count } else { -1 }
    Add-Check -Checks $checks -Name "dependabot triage visibility" -Status $(if ($dependabotOpenCount -ge 0) { "informational" } else { "warning" }) -Details "$dependabotOpenCount open Dependabot PR(s)"

    $failedChecks = @($checks | Where-Object { $_.status -eq "failed" })
    $ownerActionChecks = @($checks | Where-Object { $_.status -eq "owner-action" })
    $overall = if ($failedChecks.Count -gt 0) {
        "failed"
    } elseif ($ownerActionChecks.Count -gt 0) {
        "passed_with_owner_actions"
    } else {
        "passed"
    }

    $summary = [ordered]@{
        status = $overall
        generatedAt = (Get-Date).ToString("o")
        repository = "$Owner/$Repo"
        tokenPresent = -not [string]::IsNullOrWhiteSpace($token)
        github = [ordered]@{
            metadata = $metadata
            branchProtected = $branchProtected
            ownerActions = $ownerActions
        }
        checks = @($checks)
        localIgnoredArtifacts = @($localIgnoredArtifacts)
        missingRequiredEvidence = @($missingRequired)
        forbiddenTrackedArtifacts = @($forbiddenTracked)
        workflows = @($workflowRows)
        dependabotOpenCount = $dependabotOpenCount
    }

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $jsonPath = Join-Path $outputRoot "professionalism-audit-$stamp.json"
    $mdPath = Join-Path $outputRoot "professionalism-audit-$stamp.md"
    $summary | ConvertTo-Json -Depth 20 | Set-Content -Path $jsonPath -Encoding UTF8

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# DevHire Professionalism Audit")
    $lines.Add("")
    $lines.Add("- Status: $overall")
    $lines.Add("- Generated: $($summary.generatedAt)")
    $lines.Add("- Repository: $Owner/$Repo")
    $lines.Add("- Branch protected: $branchProtected")
    $lines.Add("- Owner actions: $($ownerActions.Count)")
    $lines.Add("- Open Dependabot PRs: $dependabotOpenCount")
    $lines.Add("")
    $lines.Add("| Check | Status | Details |")
    $lines.Add("|---|---|---|")
    foreach ($check in $checks) {
        $safeDetails = ($check.details -replace "\|", "/")
        $lines.Add("| $($check.name) | $($check.status) | $safeDetails |")
    }
    $lines.Add("")
    $lines.Add("## Owner Actions")
    $lines.Add("")
    if ($ownerActions.Count -eq 0) {
        $lines.Add("- None.")
    } else {
        foreach ($action in $ownerActions) {
            $lines.Add("- $action")
        }
    }
    $lines | Set-Content -Path $mdPath -Encoding UTF8

    $summary | ConvertTo-Json -Depth 20
    if ($overall -eq "failed") {
        exit 1
    }
} finally {
    Pop-Location
}
