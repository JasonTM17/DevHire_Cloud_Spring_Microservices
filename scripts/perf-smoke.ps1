[CmdletBinding()]
param(
    [string]$BaseUrl = $(if ($env:K6_BASE_URL) { $env:K6_BASE_URL } else { "http://localhost:8080" }),
    [string]$ContainerBaseUrl,
    [int]$Vus = $(if ($env:K6_VUS) { [int]$env:K6_VUS } else { 5 }),
    [string]$Duration = $(if ($env:K6_DURATION) { $env:K6_DURATION } else { "30s" }),
    [string]$SearchKeyword = $(if ($env:K6_SEARCH_KEYWORD) { $env:K6_SEARCH_KEYWORD } else { "Java" }),
    [switch]$UseDocker,
    [string]$K6Image = $(if ($env:K6_IMAGE) { $env:K6_IMAGE } else { "grafana/k6:0.56.0" }),
    [string]$SummaryPath = "reports/k6/job-search-summary.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$scriptPath = Join-Path $repoRoot "perf\k6\job-search-smoke.js"
$summaryFullPath = Join-Path $repoRoot $SummaryPath
$summaryDir = Split-Path -Parent $summaryFullPath
New-Item -ItemType Directory -Force -Path $summaryDir | Out-Null

if (-not (Test-Path $scriptPath)) {
    throw "k6 script not found: $scriptPath"
}

$k6Command = Get-Command k6 -ErrorAction SilentlyContinue
if (-not $UseDocker -and $null -ne $k6Command) {
    $env:BASE_URL = $BaseUrl
    $env:VUS = [string]$Vus
    $env:DURATION = $Duration
    $env:SEARCH_KEYWORD = $SearchKeyword

    k6 run --summary-export $summaryFullPath $scriptPath
    if ($LASTEXITCODE -ne 0) {
        throw "k6 performance smoke failed"
    }
    return
}

$isWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform(
    [System.Runtime.InteropServices.OSPlatform]::Windows
)

if ([string]::IsNullOrWhiteSpace($ContainerBaseUrl)) {
    $ContainerBaseUrl = $BaseUrl
    if ($isWindows) {
        $ContainerBaseUrl = $ContainerBaseUrl -replace "localhost", "host.docker.internal"
        $ContainerBaseUrl = $ContainerBaseUrl -replace "127\.0\.0\.1", "host.docker.internal"
    }
}

$dockerArgs = @(
    "run", "--rm",
    "-e", "BASE_URL=$ContainerBaseUrl",
    "-e", "VUS=$Vus",
    "-e", "DURATION=$Duration",
    "-e", "SEARCH_KEYWORD=$SearchKeyword",
    "-v", "${repoRoot}:/workspace",
    "-w", "/workspace"
)

if (-not $isWindows) {
    $dockerArgs += "--network=host"
}

$dockerArgs += @(
    $K6Image,
    "run",
    "--summary-export", "/workspace/$($SummaryPath -replace '\\', '/')",
    "/workspace/perf/k6/job-search-smoke.js"
)

docker @dockerArgs
if ($LASTEXITCODE -ne 0) {
    throw "k6 Docker performance smoke failed"
}
