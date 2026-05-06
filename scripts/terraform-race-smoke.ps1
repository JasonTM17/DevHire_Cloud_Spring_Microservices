[CmdletBinding()]
param(
    [string[]]$Environments = @("dev"),
    [switch]$IncludeScanners,
    [int]$ParallelRuns = 2,
    [int]$TimeoutSeconds = 1200
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($ParallelRuns -lt 2) {
    throw "ParallelRuns must be at least 2 to exercise Terraform validation locking."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$terraformScript = Join-Path $PSScriptRoot "terraform-validate.ps1"
$started = Get-Date

Write-Host "Starting $ParallelRuns concurrent Terraform validation runs."
Write-Host "Environments: $($Environments -join ', ')"
Write-Host "Scanners: $(if ($IncludeScanners) { 'enabled' } else { 'skipped for race smoke' })"

$jobs = for ($i = 1; $i -le $ParallelRuns; $i++) {
    Start-Job -Name "terraform-race-$i" -ScriptBlock {
        param(
            [string]$RepoRoot,
            [string]$TerraformScript,
            [string[]]$Environments,
            [bool]$IncludeScanners
        )

        Set-Location $RepoRoot
        & $TerraformScript `
            -Environments $Environments `
            -SkipTflint:(!$IncludeScanners) `
            -SkipTrivy:(!$IncludeScanners)
        if ($LASTEXITCODE -ne 0) {
            throw "terraform-validate.ps1 exited with code $LASTEXITCODE"
        }
    } -ArgumentList $repoRoot, $terraformScript, $Environments, $IncludeScanners.IsPresent
}

try {
    $completed = Wait-Job -Job $jobs -Timeout $TimeoutSeconds
    if ($completed.Count -ne $jobs.Count) {
        $running = $jobs | Where-Object { $_.State -eq "Running" }
        throw "Timed out after ${TimeoutSeconds}s waiting for Terraform race smoke jobs: $($running.Name -join ', ')"
    }

    $failedJobs = @()
    foreach ($job in $jobs) {
        Write-Host ""
        Write-Host "==> Output from $($job.Name)"
        Receive-Job -Job $job
        if ($job.State -ne "Completed") {
            $failedJobs += $job
        }
    }

    if ($failedJobs.Count -gt 0) {
        throw "Terraform race smoke failed for jobs: $($failedJobs.Name -join ', ')"
    }

    $duration = [Math]::Round(((Get-Date) - $started).TotalSeconds, 2)
    Write-Host ""
    Write-Host "Terraform race smoke passed in ${duration}s."
    Write-Host "The validation lock serialized cache cleanup without hiding Terraform validation failures."
} finally {
    $jobs | Remove-Job -Force -ErrorAction SilentlyContinue
}
