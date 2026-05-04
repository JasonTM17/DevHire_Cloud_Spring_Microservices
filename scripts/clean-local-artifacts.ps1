[CmdletBinding()]
param(
    [switch]$DryRun,
    [switch]$Apply,
    [switch]$IncludeLocalEnv,
    [switch]$IncludeNodeModules,
    [string]$OutputDir = "reports/local-cleanup"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $DryRun -and -not $Apply) {
    $DryRun = $true
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$repoRootWithSeparator = $repoRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

function Resolve-WorkspacePath {
    param([Parameter(Mandatory = $true)][string]$Path)

    $fullPath = if ([System.IO.Path]::IsPathRooted($Path)) {
        [System.IO.Path]::GetFullPath($Path)
    } else {
        [System.IO.Path]::GetFullPath((Join-Path $repoRoot $Path))
    }

    if ($fullPath -eq $repoRoot -or -not $fullPath.StartsWith($repoRootWithSeparator, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to operate outside workspace: $fullPath"
    }

    return $fullPath
}

function Get-WorkspaceRelativePath {
    param([Parameter(Mandatory = $true)][string]$FullPath)

    $rootUri = [System.Uri]::new($repoRootWithSeparator)
    $pathUri = [System.Uri]::new([System.IO.Path]::GetFullPath($FullPath))
    return [System.Uri]::UnescapeDataString($rootUri.MakeRelativeUri($pathUri).ToString()).Replace("/", [System.IO.Path]::DirectorySeparatorChar)
}

function New-Candidate {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Reason,
        [Parameter(Mandatory = $true)][bool]$DeleteByDefault
    )

    $fullPath = Resolve-WorkspacePath -Path $Path
    if (-not (Test-Path -LiteralPath $fullPath)) {
        return $null
    }

    $item = Get-Item -LiteralPath $fullPath -Force
    [pscustomobject]@{
        path = $Path.Replace("\", "/")
        fullPath = $fullPath
        kind = if ($item.PSIsContainer) { "directory" } else { "file" }
        reason = $Reason
        delete = $DeleteByDefault
    }
}

$candidates = [System.Collections.Generic.List[object]]::new()

foreach ($path in @(
    "reports",
    ".github/java-upgrade",
    "frontend/.next",
    "frontend/playwright-report",
    "frontend/test-results",
    "frontend/tsconfig.tsbuildinfo"
)) {
    $candidate = New-Candidate -Path $path -Reason "Generated local verification/build artifact." -DeleteByDefault $true
    if ($null -ne $candidate) { $candidates.Add($candidate) }
}

Get-ChildItem -Path $repoRoot -Directory -Recurse -Filter target -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "\\node_modules\\" } |
    ForEach-Object {
        $relative = Get-WorkspaceRelativePath -FullPath $_.FullName
        $candidate = New-Candidate -Path $relative -Reason "Generated Maven build output." -DeleteByDefault $true
        if ($null -ne $candidate) { $candidates.Add($candidate) }
    }

Get-ChildItem -Path $repoRoot -File -Recurse -Include "hs_err_pid*.log", "replay_pid*.log" -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "\\node_modules\\" } |
    ForEach-Object {
        $relative = Get-WorkspaceRelativePath -FullPath $_.FullName
        $candidate = New-Candidate -Path $relative -Reason "Local JVM crash diagnostic log." -DeleteByDefault $true
        if ($null -ne $candidate) { $candidates.Add($candidate) }
    }

$envCandidate = New-Candidate -Path ".env" -Reason "Ignored local secret file; kept by default." -DeleteByDefault ([bool]$IncludeLocalEnv)
if ($null -ne $envCandidate) { $candidates.Add($envCandidate) }

$nodeModulesCandidate = New-Candidate -Path "frontend/node_modules" -Reason "Ignored frontend dependency cache; kept by default because reinstalling is expensive." -DeleteByDefault ([bool]$IncludeNodeModules)
if ($null -ne $nodeModulesCandidate) { $candidates.Add($nodeModulesCandidate) }

$uniqueCandidates = @(
    $candidates |
        Group-Object fullPath |
        ForEach-Object { $_.Group | Select-Object -First 1 } |
        Sort-Object fullPath
)

$deleted = [System.Collections.Generic.List[object]]::new()
if ($Apply) {
    foreach ($candidate in $uniqueCandidates | Where-Object { $_.delete }) {
        Remove-Item -LiteralPath $candidate.fullPath -Recurse -Force
        $deleted.Add($candidate)
    }
}

$outputFullPath = Resolve-WorkspacePath -Path $OutputDir
New-Item -ItemType Directory -Force -Path $outputFullPath | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $outputFullPath "local-cleanup-$stamp.json"
$mdPath = Join-Path $outputFullPath "local-cleanup-$stamp.md"

$summary = [pscustomobject]@{
    status = "passed"
    mode = if ($Apply) { "apply" } else { "dry-run" }
    generatedAt = (Get-Date).ToString("o")
    includeLocalEnv = [bool]$IncludeLocalEnv
    includeNodeModules = [bool]$IncludeNodeModules
    candidateCount = $uniqueCandidates.Count
    deleteCandidateCount = @($uniqueCandidates | Where-Object { $_.delete }).Count
    deletedCount = $deleted.Count
    candidates = @($uniqueCandidates | Select-Object path, kind, reason, delete)
}
$summary | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# Local Artifact Cleanup")
$lines.Add("")
$lines.Add("- Status: $($summary.status)")
$lines.Add("- Mode: $($summary.mode)")
$lines.Add("- Generated: $($summary.generatedAt)")
$lines.Add("- Candidates: $($summary.candidateCount)")
$lines.Add("- Delete candidates: $($summary.deleteCandidateCount)")
$lines.Add("- Deleted: $($summary.deletedCount)")
$lines.Add("")
$lines.Add("| Path | Kind | Delete | Reason |")
$lines.Add("|---|---|---|---|")
foreach ($candidate in $uniqueCandidates) {
    $lines.Add("| `$($candidate.path)` | $($candidate.kind) | $($candidate.delete) | $($candidate.reason) |")
}
$lines | Set-Content -Path $mdPath -Encoding UTF8

Write-Host "Local artifact cleanup summary:"
Write-Host ("  mode              : {0}" -f $summary.mode)
Write-Host ("  candidates        : {0}" -f $summary.candidateCount)
Write-Host ("  delete candidates : {0}" -f $summary.deleteCandidateCount)
Write-Host ("  deleted           : {0}" -f $summary.deletedCount)
Write-Host ("  include .env      : {0}" -f $summary.includeLocalEnv)
Write-Host ("  include node_modules : {0}" -f $summary.includeNodeModules)
Write-Host ""
Write-Host "Reports:"
Write-Host "  $jsonPath"
Write-Host "  $mdPath"

if ($DryRun) {
    Write-Host ""
    Write-Host "Dry run only. Re-run with -Apply to delete safe generated artifacts."
}
