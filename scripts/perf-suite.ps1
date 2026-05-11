[CmdletBinding()]
param(
    [string]$GatewayUrl = $(if ($env:K6_BASE_URL) { $env:K6_BASE_URL } else { "http://localhost:8080" }),
    [ValidateSet("all", "public-search", "candidate-apply", "employer-review", "admin-audit", "ai-fallback")]
    [string]$Scenario = $(if ($env:K6_SCENARIO) { $env:K6_SCENARIO } else { "all" }),
    [string]$ContainerGatewayUrl,
    [int]$Vus = $(if ($env:K6_VUS) { [int]$env:K6_VUS } else { 5 }),
    [string]$Duration = $(if ($env:K6_DURATION) { $env:K6_DURATION } else { "30s" }),
    [switch]$UseDocker,
    [string]$K6Image = $(if ($env:K6_IMAGE) { $env:K6_IMAGE } else { "grafana/k6:0.56.0" }),
    [string]$SummaryPath = "reports/k6/role-based-suite-summary.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$scriptPath = Join-Path $repoRoot "perf\k6\role-based-suite.js"
$summaryFullPath = Join-Path $repoRoot $SummaryPath
$summaryDir = Split-Path -Parent $summaryFullPath
New-Item -ItemType Directory -Force -Path $summaryDir | Out-Null

if (-not (Test-Path $scriptPath)) {
    throw "k6 role-based suite not found: $scriptPath"
}

$k6Command = Get-Command k6 -ErrorAction SilentlyContinue
if (-not $UseDocker -and $null -ne $k6Command) {
    $env:BASE_URL = $GatewayUrl
    $env:SCENARIO = $Scenario
    $env:VUS = [string]$Vus
    $env:DURATION = $Duration

    k6 run --summary-export $summaryFullPath $scriptPath
    if ($LASTEXITCODE -ne 0) {
        throw "k6 role-based performance suite failed"
    }
    return
}

$runningOnWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform(
    [System.Runtime.InteropServices.OSPlatform]::Windows
)

if ([string]::IsNullOrWhiteSpace($ContainerGatewayUrl)) {
    $ContainerGatewayUrl = $GatewayUrl
    if ($runningOnWindows) {
        $ContainerGatewayUrl = $ContainerGatewayUrl -replace "localhost", "host.docker.internal"
        $ContainerGatewayUrl = $ContainerGatewayUrl -replace "127\.0\.0\.1", "host.docker.internal"
    }
}

$dockerArgs = @(
    "run", "--rm",
    "-e", "BASE_URL=$ContainerGatewayUrl",
    "-e", "SCENARIO=$Scenario",
    "-e", "VUS=$Vus",
    "-e", "DURATION=$Duration",
    "-v", "${repoRoot}:/workspace",
    "-w", "/workspace"
)

if (-not $runningOnWindows) {
    $dockerArgs += "--network=host"
}

$dockerArgs += @(
    $K6Image,
    "run",
    "--summary-export", "/workspace/$($SummaryPath -replace '\\', '/')",
    "/workspace/perf/k6/role-based-suite.js"
)

docker @dockerArgs
if ($LASTEXITCODE -ne 0) {
    throw "k6 Docker role-based performance suite failed"
}
