[CmdletBinding()]
param(
    [string]$OutputDir = "reports/domain-placeholder-audit"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputRoot = if ([System.IO.Path]::IsPathRooted($OutputDir)) {
    [System.IO.Path]::GetFullPath($OutputDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OutputDir))
}

$blockedPatterns = @(
    ("devhire" + "\.example\.com"),
    ("staging\.devhire" + "\.example\.com"),
    ("smtp" + "\.example\.com")
)

function Test-ApprovedPath {
    param([Parameter(Mandatory = $true)][string]$Path)

    $normalized = $Path -replace "\\", "/"
    return (
        $normalized -like "docs/*" -or
        $normalized -like "*/src/test/*" -or
        $normalized -like "reports/*"
    )
}

Push-Location $repoRoot
try {
    $trackedFiles = @(git ls-files)
    if ($LASTEXITCODE -ne 0) {
        throw "git ls-files failed"
    }

    $violations = [System.Collections.Generic.List[object]]::new()
    foreach ($file in $trackedFiles) {
        if (Test-ApprovedPath -Path $file) {
            continue
        }
        if (-not (Test-Path $file)) {
            continue
        }

        $matches = Select-String -Path $file -Pattern $blockedPatterns -AllMatches -ErrorAction SilentlyContinue
        foreach ($match in $matches) {
            $violations.Add([pscustomobject]@{
                path = $file
                line = $match.LineNumber
                text = $match.Line.Trim()
            })
        }
    }

    New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $jsonPath = Join-Path $outputRoot "domain-placeholder-audit-$stamp.json"
    $mdPath = Join-Path $outputRoot "domain-placeholder-audit-$stamp.md"
    $status = if ($violations.Count -eq 0) { "passed" } else { "failed" }
    $summary = [pscustomobject]@{
        status = $status
        generatedAt = (Get-Date).ToString("o")
        blockedPatterns = $blockedPatterns
        approvedPathPolicy = @("docs/*", "*/src/test/*", "reports/*")
        violations = @($violations)
    }
    $summary | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# DevHire Domain Placeholder Audit")
    $lines.Add("")
    $lines.Add("- Status: $status")
    $lines.Add("- Generated: $($summary.generatedAt)")
    $lines.Add("")
    $lines.Add("Runtime manifests and source files must not scatter legacy example-domain placeholders.")
    $lines.Add("Use Helm `global.publicDomain`, `global.publicBaseUrl`, `global.smtpFrom`, and `global.smtpReplyTo`, or the raw Kubernetes replacement block.")
    $lines.Add("")
    if ($violations.Count -eq 0) {
        $lines.Add("No unmanaged placeholder domains found.")
    } else {
        $lines.Add("| Path | Line | Text |")
        $lines.Add("|---|---:|---|")
        foreach ($violation in $violations) {
            $safeText = $violation.text.Replace("|", "\|")
            $lines.Add("| $($violation.path) | $($violation.line) | `$safeText` |")
        }
    }
    $lines | Set-Content -Path $mdPath -Encoding UTF8

    Write-Host "Domain placeholder audit: $status"
    Write-Host "Reports:"
    Write-Host "  $jsonPath"
    Write-Host "  $mdPath"

    if ($violations.Count -gt 0) {
        throw "Unmanaged placeholder domains found outside approved docs/tests."
    }
} finally {
    Pop-Location
}
