[CmdletBinding()]
param(
    [int[]]$Ports = @(8080, 3001, 8025, 9090, 3000),
    [string]$OutputDir = "reports/runtime-preflight",
    [switch]$RequireFreePorts
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputFullPath = if ([System.IO.Path]::IsPathRooted($OutputDir)) {
    [System.IO.Path]::GetFullPath($OutputDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OutputDir))
}

$checks = [System.Collections.Generic.List[object]]::new()

function Add-Check {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Status,
        [string]$Details = ""
    )

    $checks.Add([pscustomobject]@{
        name = $Name
        status = $Status
        details = $Details
    })
}

function Test-PortOpen {
    param([Parameter(Mandatory = $true)][int]$Port)

    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        $connected = $async.AsyncWaitHandle.WaitOne(300)
        if (-not $connected) {
            return $false
        }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

Push-Location $repoRoot
try {
    $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
    if ($null -eq $dockerCommand) {
        Add-Check -Name "docker cli" -Status "failed" -Details "docker command was not found on PATH"
    } else {
        Add-Check -Name "docker cli" -Status "passed" -Details $dockerCommand.Source
    }

    if ($null -ne $dockerCommand) {
        $dockerInfoOutput = & docker info --format "{{.ServerVersion}}" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Add-Check -Name "docker daemon" -Status "passed" -Details "server version $dockerInfoOutput"
        } else {
            Add-Check -Name "docker daemon" -Status "failed" -Details (($dockerInfoOutput | Out-String).Trim())
        }
    }

    $composeOutput = & docker compose config --quiet 2>&1
    if ($LASTEXITCODE -eq 0) {
        Add-Check -Name "docker compose config" -Status "passed" -Details "compose syntax is valid"
    } else {
        Add-Check -Name "docker compose config" -Status "failed" -Details (($composeOutput | Out-String).Trim())
    }

    foreach ($port in $Ports) {
        $inUse = Test-PortOpen -Port $port
        if ($inUse -and $RequireFreePorts) {
            Add-Check -Name "port $port" -Status "failed" -Details "port is already accepting TCP connections"
        } elseif ($inUse) {
            Add-Check -Name "port $port" -Status "warning" -Details "port is already accepting TCP connections; this is fine if the DevHire stack is already running"
        } else {
            Add-Check -Name "port $port" -Status "passed" -Details "port is currently free"
        }
    }
} finally {
    Pop-Location
}

$failedCount = @($checks | Where-Object { $_.status -eq "failed" }).Count
$warningCount = @($checks | Where-Object { $_.status -eq "warning" }).Count
$overall = if ($failedCount -gt 0) { "failed" } elseif ($warningCount -gt 0) { "warning" } else { "passed" }

New-Item -ItemType Directory -Force -Path $outputFullPath | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $outputFullPath "runtime-preflight-$stamp.json"
$mdPath = Join-Path $outputFullPath "runtime-preflight-$stamp.md"

$summary = [pscustomobject]@{
    status = $overall
    generatedAt = (Get-Date).ToString("o")
    requireFreePorts = [bool]$RequireFreePorts
    checks = @($checks)
    recoveryHint = "Start Docker Desktop, free conflicting ports if needed, then rerun docker compose up -d --build."
}
$summary | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# DevHire Runtime Preflight Report")
$lines.Add("")
$lines.Add("- Status: $overall")
$lines.Add("- Generated: $($summary.generatedAt)")
$lines.Add("- Require free ports: $([bool]$RequireFreePorts)")
$lines.Add("")
$lines.Add("| Check | Status | Details |")
$lines.Add("|---|---|---|")
foreach ($check in $checks) {
    $details = $check.details.Replace("|", "\|")
    $lines.Add("| $($check.name) | $($check.status) | $details |")
}
$lines.Add("")
$lines.Add($summary.recoveryHint)
$lines | Set-Content -Path $mdPath -Encoding UTF8

$summary | ConvertTo-Json -Depth 8

if ($failedCount -gt 0) {
    exit 1
}

