[CmdletBinding(DefaultParameterSetName = "DryRun")]
param(
    [Parameter(ParameterSetName = "DryRun")]
    [switch]$DryRun,

    [Parameter(ParameterSetName = "Apply")]
    [switch]$Apply,

    [string]$Owner = "JasonTM17",
    [string]$Repo = "DevHire_Cloud_Spring_Microservices",
    [string]$Homepage = "https://github.com/JasonTM17/DevHire_Cloud_Spring_Microservices/releases/tag/v0.3.0",
    [string]$Description = "Production-grade Java 21 Spring Boot microservices recruitment platform with JWT, Kafka, OpenSearch, Docker, Kubernetes, Terraform, observability, CI/CD, and Claude Haiku AI RAG assistant.",
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

if (-not $DryRun -and -not $Apply) {
    $DryRun = $true
}

$repoApi = "https://api.github.com/repos/$Owner/$Repo"
$headers = @{
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
    "User-Agent" = "DevHire-Repo-Polish"
}

$repoPayload = [ordered]@{
    description = $Description
    homepage = $Homepage
    has_issues = $true
    has_projects = $true
    has_wiki = $true
}

$topicsPayload = [ordered]@{
    names = $Topics
}

Write-Host "Repository metadata target:"
$repoPayload | ConvertTo-Json -Depth 4
Write-Host ""
Write-Host "Repository topics target:"
$topicsPayload | ConvertTo-Json -Depth 4

if ($DryRun) {
    Write-Host ""
    Write-Host "Dry run only. Re-run with -Apply and GITHUB_TOKEN to update GitHub repository metadata."
    exit 0
}

if ([string]::IsNullOrWhiteSpace($env:GITHUB_TOKEN)) {
    throw "GITHUB_TOKEN is required for -Apply. Create a token with repository metadata permissions and set it only in the current shell."
}

$headers["Authorization"] = "Bearer $env:GITHUB_TOKEN"

Invoke-RestMethod -Method Patch -Uri $repoApi -Headers $headers -Body ($repoPayload | ConvertTo-Json -Depth 4) -ContentType "application/json" | Out-Null
Invoke-RestMethod -Method Put -Uri "$repoApi/topics" -Headers $headers -Body ($topicsPayload | ConvertTo-Json -Depth 4) -ContentType "application/json" | Out-Null

Write-Host "GitHub repository metadata updated. Branch protection still requires manual owner review."
