[CmdletBinding()]
param(
    [string]$ManifestPath = "docs/evidence-manifest.json",
    [string]$OutputDir = "reports/evidence-audit"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$manifestFullPath = if ([System.IO.Path]::IsPathRooted($ManifestPath)) {
    [System.IO.Path]::GetFullPath($ManifestPath)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ManifestPath))
}
$outputFullPath = if ([System.IO.Path]::IsPathRooted($OutputDir)) {
    [System.IO.Path]::GetFullPath($OutputDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OutputDir))
}

function Test-GitPattern {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Pattern
    )

    $regex = "^" + [regex]::Escape($Pattern).Replace("\*", ".*") + "$"
    return $Path -match $regex
}

if (-not (Test-Path $manifestFullPath)) {
    throw "Evidence manifest is missing: $manifestFullPath"
}

$manifest = Get-Content -Raw -Encoding UTF8 $manifestFullPath | ConvertFrom-Json
if (-not $manifest.version) {
    throw "Evidence manifest is missing version"
}
if (-not $manifest.categories -or $manifest.categories.Count -eq 0) {
    throw "Evidence manifest has no categories"
}

Push-Location $repoRoot
try {
    $categoryResults = foreach ($category in $manifest.categories) {
        if (-not $category.name) {
            throw "Evidence category is missing name"
        }
        $requiredPaths = @($category.requiredPaths)
        $missing = @()
        foreach ($path in $requiredPaths) {
            if (-not (Test-Path (Join-Path $repoRoot $path))) {
                $missing += $path
            }
        }

        [pscustomobject]@{
            name = $category.name
            description = $category.description
            requiredCount = $requiredPaths.Count
            missingCount = $missing.Count
            missing = $missing
            status = if ($missing.Count -eq 0) { "passed" } else { "failed" }
        }
    }

    $trackedFiles = @(git ls-files)
    if ($LASTEXITCODE -ne 0) {
        throw "git ls-files failed"
    }
    $forbiddenMatches = @()
    foreach ($file in $trackedFiles) {
        foreach ($pattern in @($manifest.forbiddenTrackedPatterns)) {
            if (Test-GitPattern -Path $file -Pattern $pattern) {
                $forbiddenMatches += [pscustomobject]@{
                    path = $file
                    pattern = $pattern
                }
            }
        }
    }

    $status = if (
        @($categoryResults | Where-Object { $_.status -ne "passed" }).Count -eq 0 -and
        @($forbiddenMatches).Count -eq 0
    ) {
        "passed"
    } else {
        "failed"
    }

    New-Item -ItemType Directory -Force -Path $outputFullPath | Out-Null
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $jsonPath = Join-Path $outputFullPath "evidence-audit-$stamp.json"
    $mdPath = Join-Path $outputFullPath "evidence-audit-$stamp.md"
    $summary = [pscustomobject]@{
        status = $status
        manifestPath = $manifestFullPath
        manifestVersion = $manifest.version
        generatedAt = (Get-Date).ToString("o")
        categories = @($categoryResults)
        forbiddenTrackedMatches = @($forbiddenMatches)
        recommendedCommands = @($manifest.recommendedCommands)
    }
    $summary | ConvertTo-Json -Depth 10 | Set-Content -Path $jsonPath -Encoding UTF8

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# DevHire Evidence Audit")
    $lines.Add("")
    $lines.Add("- Status: $status")
    $lines.Add("- Manifest version: $($manifest.version)")
    $lines.Add("- Generated: $($summary.generatedAt)")
    $lines.Add("")
    $lines.Add("| Category | Status | Required | Missing |")
    $lines.Add("|---|---|---:|---:|")
    foreach ($category in $categoryResults) {
        $lines.Add("| $($category.name) | $($category.status) | $($category.requiredCount) | $($category.missingCount) |")
    }
    $lines.Add("")
    $lines.Add("## Forbidden Tracked Artifacts")
    $lines.Add("")
    if (@($forbiddenMatches).Count -eq 0) {
        $lines.Add("None.")
    } else {
        foreach ($match in $forbiddenMatches) {
            $lines.Add("- $($match.path) matched $($match.pattern)")
        }
    }
    $lines | Set-Content -Path $mdPath -Encoding UTF8

    $summary | ConvertTo-Json -Depth 10
    if ($status -ne "passed") {
        exit 1
    }
} finally {
    Pop-Location
}
