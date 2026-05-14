[CmdletBinding()]
param(
    [string]$OutputDir = "reports/secret-config-audit"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputRoot = if ([System.IO.Path]::IsPathRooted($OutputDir)) {
    [System.IO.Path]::GetFullPath($OutputDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OutputDir))
}

$patterns = @(
    [pscustomobject]@{ name = "api-key-token"; regex = "(?i)\b(?:sk-ant|sk-proj|sk)-[A-Za-z0-9_-]{20,}\b" },
    [pscustomobject]@{ name = "github-token"; regex = "\bgh[pousr]_[A-Za-z0-9_]{30,}\b" },
    [pscustomobject]@{ name = "aws-access-key"; regex = "\b(?:AKIA|ASIA)[0-9A-Z]{16}\b" },
    [pscustomobject]@{ name = "google-api-key"; regex = "\bAIza[0-9A-Za-z_-]{35}\b" },
    [pscustomobject]@{ name = "slack-token"; regex = "\bxox[baprs]-[A-Za-z0-9-]{20,}\b" },
    [pscustomobject]@{ name = "private-key"; regex = "-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----" }
)

$textExtensions = @(
    ".adoc", ".conf", ".css", ".csv", ".dockerfile", ".env", ".gradle", ".graphql",
    ".hcl", ".html", ".http", ".java", ".js", ".json", ".jsx", ".kt", ".md",
    ".mjs", ".properties", ".ps1", ".sql", ".tf", ".toml", ".ts", ".tsx",
    ".txt", ".xml", ".yaml", ".yml"
)

Push-Location $repoRoot
try {
    $trackedFiles = @(git ls-files)
    if ($LASTEXITCODE -ne 0) {
        throw "git ls-files failed"
    }

    $matches = [System.Collections.Generic.List[object]]::new()
    foreach ($relativePath in $trackedFiles) {
        $extension = [System.IO.Path]::GetExtension($relativePath).ToLowerInvariant()
        $fileName = [System.IO.Path]::GetFileName($relativePath).ToLowerInvariant()
        if ($extension -notin $textExtensions -and $fileName -notin @("dockerfile", "makefile", ".env.example")) {
            continue
        }

        $fullPath = Join-Path $repoRoot $relativePath
        try {
            $content = Get-Content -Raw -Encoding UTF8 -LiteralPath $fullPath
        } catch {
            continue
        }

        foreach ($pattern in $patterns) {
            $regexMatches = [regex]::Matches($content, $pattern.regex)
            foreach ($match in $regexMatches) {
                $before = $content.Substring(0, $match.Index)
                $line = ($before -split "`n").Count
                $hash = [System.Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($match.Value))
                $matches.Add([pscustomobject]@{
                    path = $relativePath
                    line = $line
                    pattern = $pattern.name
                    fingerprint = ([Convert]::ToHexString($hash).Substring(0, 16)).ToLowerInvariant()
                })
            }
        }
    }

    New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
    $summary = [pscustomobject]@{
        status = if ($matches.Count -eq 0) { "passed" } else { "failed" }
        scannedFiles = $trackedFiles.Count
        matchCount = $matches.Count
        generatedAt = (Get-Date).ToString("o")
        matches = @($matches)
    }
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $summary | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 -Path (Join-Path $outputRoot "secret-config-audit-$stamp.json")

    if ($matches.Count -gt 0) {
        $matches | Format-Table -AutoSize
        throw "Secret/config audit failed with $($matches.Count) high-risk match(es)."
    }

    Write-Host "Secret/config audit passed."
} finally {
    Pop-Location
}
