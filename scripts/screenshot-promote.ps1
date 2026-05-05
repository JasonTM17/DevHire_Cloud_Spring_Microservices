[CmdletBinding()]
param(
    [string]$SourceDir = "frontend/test-results/portfolio-screenshots",
    [string]$TargetDir = "docs/screenshots",
    [string[]]$Names = @(
        "jobs-page.png",
        "job-detail.png",
        "candidate-dashboard.png",
        "assistant-page.png",
        "employer-dashboard.png",
        "admin-dashboard.png"
    )
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$sourceRoot = if ([System.IO.Path]::IsPathRooted($SourceDir)) {
    [System.IO.Path]::GetFullPath($SourceDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $SourceDir))
}
$targetRoot = if ([System.IO.Path]::IsPathRooted($TargetDir)) {
    [System.IO.Path]::GetFullPath($TargetDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $TargetDir))
}

if (-not (Test-Path $sourceRoot)) {
    throw "Screenshot source directory is missing: $sourceRoot. Run frontend portfolio screenshot capture first."
}
New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null

$promoted = @()
foreach ($name in $Names) {
    $source = Join-Path $sourceRoot $name
    if (-not (Test-Path $source)) {
        throw "Expected screenshot is missing: $source"
    }

    $target = Join-Path $targetRoot $name
    Copy-Item -Path $source -Destination $target -Force
    $promoted += [pscustomobject]@{
        name = $name
        source = $source
        target = $target
    }
}

Write-Host "Promoted portfolio screenshots:"
$promoted | Format-Table -AutoSize | Out-String | Write-Host
