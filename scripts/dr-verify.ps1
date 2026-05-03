[CmdletBinding()]
param(
    [string]$GatewayUrl = $(if ($env:E2E_GATEWAY_URL) { $env:E2E_GATEWAY_URL } else { "http://localhost:8080" }),
    [string]$OutputDir = ".\reports\dr-verify",
    [string[]]$Databases = @("devhire_job", "devhire_application", "devhire_notification"),
    [switch]$RunApiSmoke,
    [int]$TimeoutSeconds = 180
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Wait-HttpOk {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$TimeoutSeconds = 180
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return
            }
        } catch {
            Start-Sleep -Seconds 3
        }
    } while ((Get-Date) -lt $deadline)

    throw "Timed out waiting for $Url"
}

function Get-FlywayCount {
    param([string]$Database)

    $count = docker exec devhire-postgres psql -U devhire -d $Database -tAc "SELECT count(*) FROM flyway_schema_history;"
    if ($LASTEXITCODE -ne 0) {
        throw "Could not query flyway history for $Database"
    }
    return [int]($count | Select-Object -First 1).Trim()
}

Wait-HttpOk -Url "$GatewayUrl/actuator/health/readiness" -TimeoutSeconds $TimeoutSeconds

$runDir = Join-Path $repoRoot $OutputDir
$runDir = Join-Path $runDir ((Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$backupJson = & (Join-Path $PSScriptRoot "backup-postgres.ps1") -OutputDir $runDir -Databases $Databases
if ($LASTEXITCODE -ne 0) {
    throw "Backup step failed during DR verification"
}
$backup = $backupJson | ConvertFrom-Json

$databaseChecks = foreach ($database in $Databases) {
    $dump = Get-ChildItem -Path $runDir -Filter "$database-*.dump" | Select-Object -First 1
    if ($null -eq $dump -or $dump.Length -le 0) {
        throw "Missing or empty DR backup artifact for $database"
    }
    [pscustomobject]@{
        database     = $database
        dumpPath      = $dump.FullName
        bytes         = $dump.Length
        flywayEntries = Get-FlywayCount -Database $database
    }
}

if ($RunApiSmoke) {
    & (Join-Path $PSScriptRoot "api-smoke.ps1") -GatewayUrl $GatewayUrl
    if ($LASTEXITCODE -ne 0) {
        throw "API smoke failed during DR verification"
    }
}

[pscustomobject]@{
    status         = "passed"
    gatewayUrl     = $GatewayUrl
    outputDir      = $runDir
    backupManifest = $backup.manifestPath
    apiSmoke       = [bool]$RunApiSmoke
    databases      = $databaseChecks
} | ConvertTo-Json -Depth 8
