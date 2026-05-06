param(
    [string]$Root = "."
)

$ErrorActionPreference = "Stop"

$thresholds = @{
    "ai-service"           = 0.445
    "api-gateway"          = 0.365
    "application-service"  = 0.63
    "audit-service"        = 0.63
    "auth-service"         = 0.44
    "common-lib"           = 0.48
    "company-service"      = 0.62
    "job-service"          = 0.52
    "notification-service" = 0.75
    "user-service"         = 0.75
}

$rootPath = (Resolve-Path $Root).Path
$failed = $false
$reports = Get-ChildItem -Path $rootPath -Recurse -Filter jacoco.xml |
    Where-Object { ($_.FullName -replace "\\", "/") -like "*/target/site/jacoco/jacoco.xml" }

if (-not $reports) {
    throw "No JaCoCo XML reports found. Run mvn clean verify before coverage check."
}

$results = [System.Collections.Generic.List[object]]::new()

foreach ($module in $thresholds.Keys | Sort-Object) {
    $report = $reports | Where-Object { ($_.FullName -replace "\\", "/") -like "*/$module/target/site/jacoco/jacoco.xml" } | Select-Object -First 1
    if (-not $report) {
        $results.Add([pscustomobject]@{
            Module = $module
            Coverage = "missing"
            Threshold = "{0:P1}" -f [double]$thresholds[$module]
            Status = "FAIL"
            Gap = "report missing"
        })
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

    $gap = $ratio - $threshold
    $results.Add([pscustomobject]@{
        Module = $module
        Coverage = "{0:P1}" -f $ratio
        Threshold = "{0:P1}" -f $threshold
        Status = $status
        Gap = "{0:P1}" -f $gap
    })

    if ($ratio -lt $threshold) {
        $failed = $true
    }
}

$results | Format-Table -AutoSize | Out-String | Write-Host

if ($failed) {
    $failedModules = @($results | Where-Object { $_.Status -ne "PASS" } | Select-Object -ExpandProperty Module)
    throw "Coverage gate failed for: $($failedModules -join ', '). Add focused tests or lower a threshold only with documented justification."
}
