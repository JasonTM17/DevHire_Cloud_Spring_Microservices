[CmdletBinding()]
param(
    [string]$ScreenshotsDir = "docs/screenshots",
    [int]$MinWidth = 1200,
    [int]$MinHeight = 850,
    [switch]$SkipSourceGuard
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
    @{ Path = "jobs-page.png"; MinKb = 100; Label = "Jobs product screenshot" },
    @{ Path = "job-detail.png"; MinKb = 100; Label = "Job detail product screenshot" },
    @{ Path = "candidate-dashboard.png"; MinKb = 70; Label = "Candidate dashboard screenshot" },
    @{ Path = "employer-dashboard.png"; MinKb = 70; Label = "Employer dashboard screenshot" },
    @{ Path = "admin-dashboard.png"; MinKb = 70; Label = "Admin dashboard screenshot" },
    @{ Path = "assistant-page.png"; MinKb = 100; Label = "AI assistant screenshot" },
    @{ Path = "docker-runtime-jobs.png"; MinKb = 100; Label = "Docker runtime jobs screenshot" },
    @{ Path = "ops-ai-provider.png"; MinKb = 100; Label = "AI provider operations evidence" },
    @{ Path = "ops-mailpit.png"; MinKb = 70; Label = "Mailpit delivery evidence" },
    @{ Path = "ops-openapi-job-service.png"; MinKb = 70; Label = "OpenAPI evidence" },
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

if (-not $SkipSourceGuard) {
    $primarySourceFiles = @(
        "frontend/src/app/admin/page.tsx",
        "frontend/src/app/employer/page.tsx",
        "frontend/src/app/candidate/page.tsx",
        "frontend/src/app/candidate/profile/page.tsx",
        "frontend/src/app/companies/[slug]/page.tsx",
        "frontend/src/app/jobs/page.tsx",
        "frontend/src/app/jobs/[id]/page.tsx",
        "frontend/src/app/assistant/page.tsx"
    )
    $forbiddenText = @(
        "UNKNOWN",
        "Loading ",
        "Pending job ID",
        "Job ID",
        "Live API Gateway is offline",
        "offline",
        "Fallback disabled",
        "local-deterministic-fallback",
        "Smoke",
        "Job `$`{jobId.slice",
        "Candidate `$`{item.candidateId.slice",
        "Job submitted for review: `$`{job.id"
    )

    foreach ($relativePath in $primarySourceFiles) {
        $sourcePath = Join-Path $repoRoot $relativePath
        if (-not (Test-Path -LiteralPath $sourcePath)) {
            throw "Visual evidence source guard missing expected file: $relativePath"
        }
        $content = Get-Content -Raw -Encoding UTF8 -LiteralPath $sourcePath
        foreach ($term in $forbiddenText) {
            if ($content.Contains($term)) {
                throw "Visual evidence source guard failed: $relativePath contains '$term'."
            }
        }
    }

    $screenshotSpec = Get-Content -Raw -Encoding UTF8 (Join-Path $repoRoot "frontend/e2e/portfolio-screenshots.spec.ts")
    foreach ($requiredAssertion in @("assertPrimaryEvidenceReady", "Reviewer demo mode", "local-deterministic-fallback")) {
        if (-not $screenshotSpec.Contains($requiredAssertion)) {
            throw "Visual evidence screenshot spec is missing required readiness assertion: $requiredAssertion"
        }
    }
}

Write-Host "Visual evidence audit passed."
