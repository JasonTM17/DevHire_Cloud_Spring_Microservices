[CmdletBinding()]
param(
    [string]$ScreenshotsDir = "docs/screenshots",
    [int]$MinWidth = 1200,
    [int]$MinHeight = 850
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$screenshotsRoot = if ([System.IO.Path]::IsPathRooted($ScreenshotsDir)) {
    [System.IO.Path]::GetFullPath($ScreenshotsDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ScreenshotsDir))
}

$checks = @(
    @{ Path = "ops-prometheus-rules.png"; MinKb = 100; Label = "Prometheus SLO alert evidence" },
    @{ Path = "ops-grafana-slo.png"; MinKb = 100; Label = "Grafana SLO dashboard evidence" }
)

function Read-PngDimension {
    param([Parameter(Mandatory = $true)][string]$Path)

    $bytes = [System.IO.File]::ReadAllBytes($Path)
    if ($bytes.Length -lt 24) {
        throw "Invalid PNG file: $Path"
    }

    $signature = @(137, 80, 78, 71, 13, 10, 26, 10)
    for ($i = 0; $i -lt $signature.Count; $i++) {
        if ($bytes[$i] -ne $signature[$i]) {
            throw "Invalid PNG signature: $Path"
        }
    }

    $width = [System.BitConverter]::ToInt32(@($bytes[19], $bytes[18], $bytes[17], $bytes[16]), 0)
    $height = [System.BitConverter]::ToInt32(@($bytes[23], $bytes[22], $bytes[21], $bytes[20]), 0)
    [pscustomobject]@{
        width = $width
        height = $height
    }
}

$results = foreach ($check in $checks) {
    $path = Join-Path $screenshotsRoot $check.Path
    if (-not (Test-Path $path)) {
        [pscustomobject]@{
            path = $check.Path
            label = $check.Label
            status = "failed"
            sizeKb = 0
            width = 0
            height = 0
            details = "missing"
        }
        continue
    }

    $file = Get-Item $path
    $dimension = Read-PngDimension -Path $file.FullName
    $sizeKb = [math]::Round($file.Length / 1kb, 1)
    $passed = $sizeKb -ge [int]$check.MinKb -and $dimension.width -ge $MinWidth -and $dimension.height -ge $MinHeight
    [pscustomobject]@{
        path = $check.Path
        label = $check.Label
        status = if ($passed) { "passed" } else { "failed" }
        sizeKb = $sizeKb
        width = $dimension.width
        height = $dimension.height
        details = "min ${MinWidth}x${MinHeight}, min $($check.MinKb)KB"
    }
}

$failed = @($results | Where-Object { $_.status -ne "passed" })
$results | Format-Table -AutoSize | Out-String | Write-Host

if ($failed.Count -gt 0) {
    throw "Visual evidence audit failed for $($failed.Count) screenshot(s). Regenerate with: cd frontend; npm run screenshots:ops-evidence"
}

Write-Host "Visual evidence audit passed."
