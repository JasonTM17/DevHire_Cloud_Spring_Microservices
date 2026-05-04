[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$requiredPaths = @(
    "README.md",
    "docs/README_EN.md",
    "docs/README_JA.md",
    "docs/demo-script.md",
    "docs/slo.md",
    "docs/security.md",
    "docs/ai-assistant.md",
    "docs/claude-haiku.md",
    "docs/ai-evaluation.md",
    "docs/portfolio-case-study.md",
    "docs/production-readiness.md",
    "docs/professional-review-map.md",
    "docs/github-owner-actions.md",
    "docs/versioning.md",
    "docs/dependency-maintenance.md",
    "docs/api-compatibility.md",
    "docs/contracts/api-compatibility-manifest.json",
    "docs/security-evidence.md",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "CHANGELOG.md",
    ".github/PULL_REQUEST_TEMPLATE.md"
)

Push-Location $repoRoot
try {
    foreach ($path in $requiredPaths) {
        if (-not (Test-Path $path)) {
            throw "Required portfolio document is missing: $path"
        }
    }

    $markdownFiles = @(
        Get-Item README.md
        Get-ChildItem docs -Recurse -Filter *.md | Where-Object { $_.Name -ne "PROGRESS.md" }
        Get-Item SECURITY.md
        Get-Item CONTRIBUTING.md
        Get-Item CHANGELOG.md
    )

    $mojibakeMarkers = @(
        [string][char]0x00C3,
        [string][char]0x00C2,
        ([string][char]0x00E2 + [string][char]0x20AC),
        [string][char]0x00E6
    )

    foreach ($file in $markdownFiles) {
        $content = Get-Content -Raw -Encoding UTF8 $file.FullName
        if ($content.Contains([char]0xFFFD)) {
            throw "Replacement character detected in $($file.FullName)"
        }
        foreach ($marker in $mojibakeMarkers) {
            if ($content.Contains($marker)) {
                throw "Potential mojibake marker detected in $($file.FullName)"
            }
        }
        if ($content -match "(?i)\b(TODO|FIXME)\b") {
            throw "Unsafe placeholder marker detected in $($file.FullName)"
        }
        if ($content -match "sk-[A-Za-z0-9_-]{20,}") {
            throw "Potential API key pattern detected in $($file.FullName)"
        }
    }

    $demo = Get-Content -Raw -Encoding UTF8 "docs/demo-script.md"
    foreach ($expected in @("/assistant", "Claude", "AI_TOOL_EXECUTED", "scripts/reset-demo-data.ps1")) {
        if ($demo -notmatch [regex]::Escape($expected)) {
            throw "Demo script is missing expected AI portfolio content: $expected"
        }
    }

    Write-Host "Documentation quality checks passed."
} finally {
    Pop-Location
}
