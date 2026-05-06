[CmdletBinding()]
param(
    [string]$Root = ".",
    [string]$ExpectedMavenVersion = "0.4.0-SNAPSHOT",
    [string]$ExpectedFrontendVersion = "0.4.0",
    [string]$LatestRelease = "v0.4.6"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$rootPath = (Resolve-Path $Root).Path

function Read-XmlFile {
    param([Parameter(Mandatory = $true)][string]$Path)
    [xml](Get-Content -Raw -Encoding UTF8 $Path)
}

$rootPomPath = Join-Path $rootPath "pom.xml"
$rootPom = Read-XmlFile -Path $rootPomPath
$rootVersion = [string]$rootPom.project.version

if ($rootVersion -ne $ExpectedMavenVersion) {
    throw "Root Maven version is $rootVersion but expected $ExpectedMavenVersion."
}

$moduleNames = @($rootPom.project.modules.module)
foreach ($module in $moduleNames) {
    $modulePomPath = Join-Path $rootPath "$module/pom.xml"
    if (-not (Test-Path $modulePomPath)) {
        throw "Module pom is missing: $modulePomPath"
    }

    $modulePom = Read-XmlFile -Path $modulePomPath
    $parentVersion = [string]$modulePom.project.parent.version
    if ($parentVersion -ne $rootVersion) {
        throw "$module parent version is $parentVersion but expected $rootVersion."
    }
}

$packageJsonPath = Join-Path $rootPath "frontend/package.json"
$packageJson = Get-Content -Raw -Encoding UTF8 $packageJsonPath | ConvertFrom-Json
if ([string]$packageJson.version -ne $ExpectedFrontendVersion) {
    throw "Frontend version is $($packageJson.version) but expected $ExpectedFrontendVersion."
}

$packageLockPath = Join-Path $rootPath "frontend/package-lock.json"
if (Test-Path $packageLockPath) {
    $packageLockText = Get-Content -Raw -Encoding UTF8 $packageLockPath
    $versionMatches = [regex]::Matches($packageLockText, '"version"\s*:\s*"([^"]+)"')
    if ($versionMatches.Count -lt 2) {
        throw "frontend/package-lock.json does not expose the expected root and package version fields."
    }
    foreach ($match in $versionMatches | Select-Object -First 2) {
        $version = $match.Groups[1].Value
        if ($version -ne $ExpectedFrontendVersion) {
            throw "Frontend package-lock version is $version but expected $ExpectedFrontendVersion."
        }
    }
}

$changelog = Get-Content -Raw -Encoding UTF8 (Join-Path $rootPath "CHANGELOG.md")
if ($changelog -notmatch "## 0\.4\.0 - Unreleased") {
    throw "CHANGELOG.md does not record the active 0.4.0 development section."
}
if ($changelog -notmatch "## 0\.3\.0 - 2026-05-04") {
    throw "CHANGELOG.md does not record the released 0.3.0 date."
}
if ($changelog -notmatch "## 0\.2\.0 - 2026-05-03") {
    throw "CHANGELOG.md does not record the released 0.2.0 date."
}

$releaseNotesPath = Join-Path $rootPath "docs/release-notes/$LatestRelease.md"
if (-not (Test-Path $releaseNotesPath)) {
    throw "Missing release notes: $releaseNotesPath"
}

$releaseNotes = Get-Content -Raw -Encoding UTF8 $releaseNotesPath
if ($releaseNotes -notmatch "Status:\s+released") {
    throw "$LatestRelease release notes must be marked as released."
}

$releaseEvidencePath = Join-Path $rootPath "docs/release-evidence/$LatestRelease.md"
if (-not (Test-Path $releaseEvidencePath)) {
    throw "Missing release evidence: $releaseEvidencePath"
}

Write-Host "Version consistency checks passed."
Write-Host "Maven: $ExpectedMavenVersion"
Write-Host "Frontend: $ExpectedFrontendVersion"
Write-Host "Latest release: $LatestRelease"
