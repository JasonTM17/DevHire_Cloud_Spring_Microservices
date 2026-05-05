[CmdletBinding()]
param(
    [string]$ManifestPath = "docs/evidence-manifest.json",
    [string[]]$MarkdownPaths = @(
        "README.md",
        "docs/README_EN.md",
        "docs/README_JA.md"
    )
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$manifestFullPath = if ([System.IO.Path]::IsPathRooted($ManifestPath)) {
    [System.IO.Path]::GetFullPath($ManifestPath)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ManifestPath))
}

if (-not (Test-Path $manifestFullPath)) {
    throw "Evidence manifest is missing: $manifestFullPath"
}

$manifest = Get-Content -Raw -Encoding UTF8 $manifestFullPath | ConvertFrom-Json
$manifestPaths = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($category in @($manifest.categories)) {
    foreach ($path in @($category.requiredPaths)) {
        [void]$manifestPaths.Add(($path -replace "\\", "/"))
    }
}

$markdownImages = [System.Collections.Generic.List[object]]::new()
$imagePattern = '!\[[^\]]*\]\((?<path>[^)#]+)(?:#[^)]+)?\)'
foreach ($relative in $MarkdownPaths) {
    $fullPath = Join-Path $repoRoot $relative
    if (-not (Test-Path $fullPath)) {
        throw "Markdown file is missing: $relative"
    }

    $content = Get-Content -Raw -Encoding UTF8 $fullPath
    foreach ($match in [regex]::Matches($content, $imagePattern)) {
        $imagePath = $match.Groups["path"].Value.Trim()
        if ($imagePath -match '^(https?:)?//') {
            continue
        }

        $baseDir = Split-Path $relative -Parent
        $resolvedRelative = if ([string]::IsNullOrWhiteSpace($baseDir)) {
            $imagePath
        } else {
            Join-Path $baseDir $imagePath
        }
        $normalized = ([System.IO.Path]::GetFullPath((Join-Path $repoRoot $resolvedRelative))).Substring($repoRoot.Length + 1) -replace "\\", "/"
        $markdownImages.Add([pscustomobject]@{
            markdown = $relative
            image = $normalized
        })
    }
}

$missingFiles = @($markdownImages | Where-Object { -not (Test-Path (Join-Path $repoRoot $_.image)) })
$missingManifest = @($markdownImages | Where-Object { -not $manifestPaths.Contains($_.image) })

Write-Host "Evidence manifest image verification:"
Write-Host ("  markdown images       : {0}" -f $markdownImages.Count)
Write-Host ("  missing image files   : {0}" -f $missingFiles.Count)
Write-Host ("  missing from manifest : {0}" -f $missingManifest.Count)

if ($missingFiles.Count -gt 0) {
    $missingFiles | ForEach-Object { Write-Host ("  missing file: {0} referenced by {1}" -f $_.image, $_.markdown) }
}
if ($missingManifest.Count -gt 0) {
    $missingManifest | ForEach-Object { Write-Host ("  missing manifest entry: {0} referenced by {1}" -f $_.image, $_.markdown) }
}

if ($missingFiles.Count -gt 0 -or $missingManifest.Count -gt 0) {
    throw "Evidence manifest verification failed."
}

Write-Host "Evidence manifest verification passed."
