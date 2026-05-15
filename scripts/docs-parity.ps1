[CmdletBinding()]
param(
    [string]$ReportDir = "reports/docs-parity"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$reportRoot = if ([System.IO.Path]::IsPathRooted($ReportDir)) {
    [System.IO.Path]::GetFullPath($ReportDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ReportDir))
}

$utf8Strict = [System.Text.UTF8Encoding]::new($false, $true)
$documents = @(
    @{ Name = "Vietnamese README"; Path = "README.md" },
    @{ Name = "English README"; Path = "docs/README_EN.md" },
    @{ Name = "Japanese README"; Path = "docs/README_JA.md" }
)

$requiredSignals = @(
    @{ Label = "DevHire Cloud"; Pattern = "DevHire Cloud" },
    @{ Label = "v0.6.0"; Pattern = "v0\.6\.0" },
    @{ Label = "v1 roadmap"; Pattern = "v1" },
    @{ Label = "Reviewer Quick Links"; Pattern = "Reviewer Quick Links" },
    @{ Label = "Public repository status"; Pattern = "Public (GitHub|Repository) Status" },
    @{ Label = "Cloud State Matrix"; Pattern = "Cloud State Matrix" },
    @{ Label = "portfolio-verify.ps1"; Pattern = "portfolio-verify\.ps1" },
    @{ Label = "cloud-verify.ps1"; Pattern = "cloud-verify\.ps1" },
    @{ Label = "Terraform"; Pattern = "Terraform" },
    @{ Label = "Claude"; Pattern = "Claude" },
    @{ Label = "OpenSearch"; Pattern = "OpenSearch" },
    @{ Label = "Kafka"; Pattern = "Kafka" },
    @{ Label = "Prometheus"; Pattern = "Prometheus" },
    @{ Label = "Grafana"; Pattern = "Grafana" },
    @{ Label = "Security"; Pattern = "Security" },
    @{ Label = "Docker"; Pattern = "Docker" }
)

function Read-StrictUtf8 {
    param([Parameter(Mandatory = $true)][string]$Path)

    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $text = $utf8Strict.GetString($bytes)
    if ($text.Contains([char]0xfffd)) {
        throw "Replacement character detected in $Path; file may be mojibake."
    }
    return $text
}

New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null

$results = [System.Collections.Generic.List[object]]::new()
foreach ($doc in $documents) {
    $path = Join-Path $repoRoot $doc.Path
    if (-not (Test-Path $path)) {
        $results.Add([pscustomobject]@{
            document = $doc.Name
            path = $doc.Path
            status = "failed"
            missingSignals = @("file missing")
        })
        continue
    }

    $content = Read-StrictUtf8 -Path $path
    $missing = @($requiredSignals | Where-Object { $content -notmatch $_.Pattern } | ForEach-Object { $_.Label })
    $results.Add([pscustomobject]@{
        document = $doc.Name
        path = $doc.Path
        status = if ($missing.Count -eq 0) { "passed" } else { "failed" }
        missingSignals = $missing
    })
}

$failed = @($results | Where-Object { $_.status -ne "passed" })
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $reportRoot "docs-parity-$stamp.json"
$mdPath = Join-Path $reportRoot "docs-parity-$stamp.md"

$summary = [pscustomobject]@{
    status = if ($failed.Count -eq 0) { "passed" } else { "failed" }
    generatedAt = (Get-Date).ToString("o")
    requiredSignals = @($requiredSignals | ForEach-Object { $_.Label })
    results = @($results)
}
$summary | ConvertTo-Json -Depth 6 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# Documentation Parity Report")
$lines.Add("")
$lines.Add("- Status: $($summary.status)")
$lines.Add("")
$lines.Add("| Document | Status | Missing signals |")
$lines.Add("|---|---|---|")
foreach ($result in $results) {
    $missing = if ($result.missingSignals.Count -eq 0) { "-" } else { ($result.missingSignals -join ", ") }
    $lines.Add("| $($result.document) | $($result.status) | $missing |")
}
$lines | Set-Content -Path $mdPath -Encoding UTF8

$results | Format-Table -AutoSize | Out-String | Write-Host
Write-Host "Docs parity reports:"
Write-Host "  $jsonPath"
Write-Host "  $mdPath"

if ($failed.Count -gt 0) {
    throw "Documentation parity failed for $($failed.Count) file(s)."
}
