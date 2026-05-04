[CmdletBinding()]
param(
    [string]$Owner = "JasonTM17",
    [string]$Repo = "DevHire_Cloud_Spring_Microservices",
    [string]$OutputDir = "reports/dependabot"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputRoot = Join-Path $repoRoot $OutputDir
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

$headers = @{
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent" = "DevHire-Dependabot-Inventory"
}

if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_TOKEN)) {
    $headers["Authorization"] = "Bearer $env:GITHUB_TOKEN"
}

$searchUri = "https://api.github.com/search/issues?q=repo:$Owner/$Repo+is:pr+is:open+author:app/dependabot&per_page=100"
$searchResult = Invoke-RestMethod -Uri $searchUri -Headers $headers
$dependabotPulls = @($searchResult.items)

function Get-Category {
    param([Parameter(Mandatory = $true)][object]$PullRequest)

    $title = [string]$PullRequest.title
    if ($title -match "github_actions|actions group|actions/") { return "github-actions" }
    if ($title -match "terraform|hashicorp/aws") { return "terraform" }
    if ($title -match "@playwright|@types|next|react|typescript|npm|frontend") { return "npm" }
    if ($title -match "docker|base-images|node from|maven, eclipse-temurin|eclipse-temurin") { return "docker" }
    if ($title -match "spring|jjwt|testcontainers|maven|org\\.") { return "maven" }
    return "other"
}

function Get-Risk {
    param([Parameter(Mandatory = $true)][object]$PullRequest)

    $title = [string]$PullRequest.title
    if ($title -match " to 25\.| ~> 6\.| to 2\.0\.| to 3\.0\.|Spring|spring-platform") {
        return "high"
    }
    if ($title -match "actions group|backend-base-images|playwright|@types") {
        return "medium"
    }
    return "low"
}

$rows = @(foreach ($pr in $dependabotPulls) {
    [pscustomobject]@{
        number = $pr.number
        title = $pr.title
        category = Get-Category -PullRequest $pr
        risk = Get-Risk -PullRequest $pr
        branch = ""
        url = $pr.html_url
    }
})

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $outputRoot "dependabot-inventory-$stamp.json"
$mdPath = Join-Path $outputRoot "dependabot-inventory-$stamp.md"

$rows | ConvertTo-Json -Depth 6 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# Dependabot Inventory")
$lines.Add("")
$lines.Add("- Generated: $((Get-Date).ToString("o"))")
$lines.Add("- Repository: $Owner/$Repo")
$lines.Add("- Open Dependabot PRs: $($rows.Count)")
$lines.Add("")
$lines.Add("| PR | Category | Risk | Title |")
$lines.Add("|---:|---|---|---|")
foreach ($row in $rows | Sort-Object category, risk, number) {
    $safeTitle = $row.title -replace "\|", "/"
    $lines.Add("| [#$($row.number)]($($row.url)) | $($row.category) | $($row.risk) | $safeTitle |")
}
$lines.Add("")
$lines.Add("## Recommended Batch Order")
$lines.Add("")
$lines.Add("1. GitHub Actions patch/minor updates after workflow lint.")
$lines.Add("2. Docker base image patch/minor updates by backend/frontend family.")
$lines.Add("3. npm patch/minor updates with frontend build and Playwright smoke.")
$lines.Add("4. Maven patch/minor updates with full backend verify.")
$lines.Add("5. Terraform provider major and runtime major upgrades only in dedicated migration PRs.")

$lines | Set-Content -Path $mdPath -Encoding UTF8

Write-Host "Dependabot inventory generated:"
Write-Host "  $jsonPath"
Write-Host "  $mdPath"
Write-Host ""
$rows | Group-Object category | Sort-Object Name | ForEach-Object {
    Write-Host ("{0,-16} {1,3}" -f $_.Name, $_.Count)
}
