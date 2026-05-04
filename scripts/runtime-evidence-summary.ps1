[CmdletBinding()]
param(
    [string]$OutputDir = "reports/runtime-evidence",
    [switch]$FailOnMissing
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputFullPath = if ([System.IO.Path]::IsPathRooted($OutputDir)) {
    [System.IO.Path]::GetFullPath($OutputDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OutputDir))
}

function Get-LatestJson {
    param(
        [Parameter(Mandatory = $true)][string]$Directory,
        [Parameter(Mandatory = $true)][string]$Pattern
    )

    $fullDirectory = Join-Path $repoRoot $Directory
    if (-not (Test-Path $fullDirectory)) {
        return $null
    }

    return Get-ChildItem -Path $fullDirectory -Filter $Pattern -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
}

function Read-JsonFile {
    param([Parameter(Mandatory = $true)][System.IO.FileInfo]$File)

    return Get-Content -Raw -Encoding UTF8 $File.FullName | ConvertFrom-Json
}

function Convert-ToRepoRelativePath {
    param([Parameter(Mandatory = $true)][string]$Path)

    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $rootPath = [System.IO.Path]::GetFullPath($repoRoot).TrimEnd([char[]]@("\", "/"))
    if ($fullPath.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $fullPath.Substring($rootPath.Length).TrimStart([char[]]@("\", "/")).Replace("\", "/")
    }
    return $fullPath
}

function Count-StepFailures {
    param($Steps)

    if ($null -eq $Steps) {
        return 0
    }
    return @($Steps | Where-Object { $_.status -and $_.status -ne "passed" }).Count
}

function Count-K6Checks {
    param($Group)

    $passes = 0
    $fails = 0
    if ($null -eq $Group) {
        return [pscustomobject]@{ checks = 0; passes = 0; fails = 0 }
    }

    if ($Group.PSObject.Properties.Name -contains "checks" -and $null -ne $Group.checks) {
        foreach ($property in $Group.checks.PSObject.Properties) {
            $passes += [int]$property.Value.passes
            $fails += [int]$property.Value.fails
        }
    }

    if ($Group.PSObject.Properties.Name -contains "groups" -and $null -ne $Group.groups) {
        foreach ($property in $Group.groups.PSObject.Properties) {
            $child = Count-K6Checks -Group $property.Value
            $passes += $child.passes
            $fails += $child.fails
        }
    }

    return [pscustomobject]@{
        checks = $passes + $fails
        passes = $passes
        fails = $fails
    }
}

function New-SourceResult {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Directory,
        [Parameter(Mandatory = $true)][string]$Pattern,
        [Parameter(Mandatory = $true)][scriptblock]$Summarize
    )

    $file = Get-LatestJson -Directory $Directory -Pattern $Pattern
    if ($null -eq $file) {
        return [pscustomobject]@{
            name = $Name
            status = "missing"
            path = Join-Path $Directory $Pattern
            generatedAt = $null
            details = "No matching generated report was found."
        }
    }

    try {
        $json = Read-JsonFile -File $file
        $summary = & $Summarize $json
        return [pscustomobject]@{
            name = $Name
            status = $summary.status
            path = Convert-ToRepoRelativePath -Path $file.FullName
            generatedAt = $file.LastWriteTime.ToString("o")
            details = $summary.details
        }
    } catch {
        return [pscustomobject]@{
            name = $Name
            status = "failed"
            path = Convert-ToRepoRelativePath -Path $file.FullName
            generatedAt = $file.LastWriteTime.ToString("o")
            details = "Could not parse generated report: $($_.Exception.Message)"
        }
    }
}

Push-Location $repoRoot
try {
    $sources = [System.Collections.Generic.List[object]]::new()

    $sources.Add((New-SourceResult -Name "portfolio verification" -Directory "reports/portfolio-verify" -Pattern "portfolio-verify-*.json" -Summarize {
        param($json)
        $failures = Count-StepFailures -Steps $json.steps
        [pscustomobject]@{
            status = if ($json.status) { [string]$json.status } elseif ($failures -eq 0) { "passed" } else { "failed" }
            details = "$(@($json.steps).Count) step(s), $failures failing"
        }
    }))

    $sources.Add((New-SourceResult -Name "runtime reliability" -Directory "reports/runtime-reliability" -Pattern "*.json" -Summarize {
        param($json)
        $failures = Count-StepFailures -Steps $json.checks
        [pscustomobject]@{
            status = if ($json.status) { [string]$json.status } elseif ($failures -eq 0) { "passed" } else { "failed" }
            details = "$(@($json.checks).Count) check(s), $failures failing"
        }
    }))

    $sources.Add((New-SourceResult -Name "ai evaluation" -Directory "reports/ai" -Pattern "eval-summary.json" -Summarize {
        param($json)
        $badAnswers = @($json.results | Where-Object { $_.citationCount -lt 1 -or $_.toolCount -lt 1 }).Count
        [pscustomobject]@{
            status = if ($badAnswers -eq 0 -and [int]$json.total -gt 0) { "passed" } else { "failed" }
            details = "$($json.total) prompt(s), provider mode $($json.provider.mode), $badAnswers answer(s) missing citation/tool trace"
        }
    }))

    $sources.Add((New-SourceResult -Name "k6 role suite" -Directory "reports/k6" -Pattern "role-based-suite-summary.json" -Summarize {
        param($json)
        $counts = Count-K6Checks -Group $json.root_group
        [pscustomobject]@{
            status = if ($counts.fails -eq 0 -and $counts.checks -gt 0) { "passed" } else { "failed" }
            details = "$($counts.checks) k6 check assertion(s), $($counts.fails) failing"
        }
    }))

    $sources.Add((New-SourceResult -Name "api compatibility" -Directory "reports/api-compatibility" -Pattern "summary.json" -Summarize {
        param($json)
        [pscustomobject]@{
            status = if ($json.status) { [string]$json.status } else { "passed" }
            details = "$($json.endpointCount) endpoint contract(s), $($json.asyncContractCount) async contract(s)"
        }
    }))

    $missingCount = @($sources | Where-Object { $_.status -eq "missing" }).Count
    $failedCount = @($sources | Where-Object { $_.status -eq "failed" }).Count
    $overall = if ($failedCount -gt 0) {
        "failed"
    } elseif ($missingCount -gt 0) {
        "incomplete"
    } else {
        "passed"
    }

    New-Item -ItemType Directory -Force -Path $outputFullPath | Out-Null
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $jsonPath = Join-Path $outputFullPath "runtime-evidence-summary-$stamp.json"
    $mdPath = Join-Path $outputFullPath "runtime-evidence-summary-$stamp.md"

    $summary = [pscustomobject]@{
        status = $overall
        generatedAt = (Get-Date).ToString("o")
        sanitized = $true
        note = "This summary intentionally does not copy runtime JWTs, SMTP payloads, provider keys, or generated screenshots."
        sources = @($sources)
    }
    $summary | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# DevHire Runtime Evidence Summary")
    $lines.Add("")
    $lines.Add("- Status: $overall")
    $lines.Add("- Generated: $($summary.generatedAt)")
    $lines.Add("- Sanitized: true")
    $lines.Add("")
    $lines.Add("| Source | Status | Generated | Details |")
    $lines.Add("|---|---|---|---|")
    foreach ($source in $sources) {
        $generated = if ($source.generatedAt) { $source.generatedAt } else { "not found" }
        $details = $source.details.Replace("|", "\|")
        $lines.Add("| $($source.name) | $($source.status) | $generated | $details |")
    }
    $lines.Add("")
    $lines.Add("Generated reports remain under `reports/` and are ignored by Git.")
    $lines | Set-Content -Path $mdPath -Encoding UTF8

    $summary | ConvertTo-Json -Depth 8

    if ($failedCount -gt 0 -or ($FailOnMissing -and $missingCount -gt 0)) {
        exit 1
    }
} finally {
    Pop-Location
}
