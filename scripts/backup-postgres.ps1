[CmdletBinding()]
param(
    [string]$OutputDir = ".\backups",
    [string[]]$Databases = @("all"),
    [string]$Container = "devhire-postgres",
    [string]$User = "devhire"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$serviceDatabases = @(
    "devhire_auth",
    "devhire_user",
    "devhire_company",
    "devhire_job",
    "devhire_application",
    "devhire_notification",
    "devhire_audit",
    "devhire_ai"
)

function Resolve-OutputDirectory {
    param([string]$Path)

    $fullPath = if ([System.IO.Path]::IsPathRooted($Path)) {
        [System.IO.Path]::GetFullPath($Path)
    } else {
        [System.IO.Path]::GetFullPath((Join-Path $repoRoot $Path))
    }
    New-Item -ItemType Directory -Force -Path $fullPath | Out-Null
    return $fullPath
}

function Resolve-Databases {
    param([string[]]$Requested)

    if ($Requested.Count -eq 1 -and $Requested[0].ToLowerInvariant() -eq "all") {
        return $serviceDatabases
    }

    foreach ($database in $Requested) {
        if ($database -notmatch "^devhire_[a-z0-9_]+$") {
            throw "Refusing to back up unexpected database name '$database'. Expected devhire_*."
        }
        if ($serviceDatabases -notcontains $database) {
            throw "Database '$database' is not in the service-owned database allow-list."
        }
    }
    return $Requested
}

function Assert-ContainerRunning {
    $status = docker inspect --format='{{.State.Running}}' $Container 2>$null
    if ($LASTEXITCODE -ne 0 -or $status -ne "true") {
        throw "PostgreSQL container '$Container' is not running. Start Docker Compose before backup."
    }
}

$outputFullPath = Resolve-OutputDirectory -Path $OutputDir
$selectedDatabases = Resolve-Databases -Requested $Databases
$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
$results = @()

Assert-ContainerRunning

foreach ($database in $selectedDatabases) {
    $fileName = "$database-$timestamp.dump"
    $containerPath = "/tmp/$fileName"
    $backupPath = Join-Path $outputFullPath $fileName

    docker exec $Container pg_dump -U $User -d $database --format=custom --no-owner --no-acl --file=$containerPath
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed for $database"
    }

    docker cp "${Container}:$containerPath" $backupPath
    if ($LASTEXITCODE -ne 0) {
        throw "docker cp failed for $database backup"
    }

    docker exec $Container rm -f $containerPath | Out-Null
    $fileInfo = Get-Item $backupPath
    if ($fileInfo.Length -le 0) {
        throw "Backup file is empty: $backupPath"
    }

    $results += [pscustomobject]@{
        database = $database
        path     = $backupPath
        bytes    = $fileInfo.Length
    }
}

$manifestPath = Join-Path $outputFullPath "manifest-$timestamp.json"
[pscustomobject]@{
    createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    container    = $Container
    user         = $User
    databases    = $results
} | ConvertTo-Json -Depth 6 | Set-Content -Path $manifestPath -Encoding UTF8

[pscustomobject]@{
    status       = "passed"
    outputDir    = $outputFullPath
    manifestPath = $manifestPath
    databases    = $results
} | ConvertTo-Json -Depth 6
