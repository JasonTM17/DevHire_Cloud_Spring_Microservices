param(
    [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$thresholds = @{
    "ai-service"           = 0.40
    "api-gateway"          = 0.35
    "application-service"  = 0.60
    "audit-service"        = 0.60
    "auth-service"         = 0.40
    "common-lib"           = 0.35
    "company-service"      = 0.60
    "job-service"          = 0.50
    "notification-service" = 0.65
    "user-service"         = 0.72
}

$rootPath = (Resolve-Path $Root).Path
$failed = $false
$reports = Get-ChildItem -Path $rootPath -Recurse -Filter jacoco.xml |
    Where-Object { ($_.FullName -replace "\\", "/") -like "*/target/site/jacoco/jacoco.xml" }

if (-not $reports) {
    throw "No JaCoCo XML reports found. Run mvn clean verify before coverage check."
}

foreach ($module in $thresholds.Keys | Sort-Object) {
    $report = $reports | Where-Object { ($_.FullName -replace "\\", "/") -like "*/$module/target/site/jacoco/jacoco.xml" } | Select-Object -First 1
    if (-not $report) {
        Write-Error "Missing JaCoCo report for $module"
        $failed = $true
        continue
    }

    [xml]$xml = Get-Content $report.FullName
    $counter = $xml.report.counter | Where-Object { $_.type -eq "INSTRUCTION" }
    $covered = [double]$counter.covered
    $missed = [double]$counter.missed
    $ratio = if (($covered + $missed) -eq 0) { 1.0 } else { $covered / ($covered + $missed) }
    $threshold = [double]$thresholds[$module]
    $status = if ($ratio -ge $threshold) { "PASS" } else { "FAIL" }

    Write-Host ("{0,-22} {1,6:P1} / {2,6:P1} {3}" -f $module, $ratio, $threshold, $status)

    if ($ratio -lt $threshold) {
        $failed = $true
    }
}

if ($failed) {
    throw "Coverage gate failed. Add tests or intentionally update thresholds with justification."
}
