[CmdletBinding()]
param(
    [string]$InputDir = ".\backups",
    [Parameter(Mandatory = $true)][string]$Database,
    [string]$BackupFile,
    [switch]$ConfirmRestore,
    [string]$Container = "devhire-postgres",
    [string]$User = "devhire"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

if (-not $ConfirmRestore) {
    throw "Restore is intentionally blocked by default. Re-run with -ConfirmRestore after verifying the target database and backup file."
}
if ($Database -notmatch "^devhire_[a-z0-9_]+$") {
    throw "Refusing to restore unexpected database name '$Database'. Expected devhire_*."
}

$inputFullPath = if ([System.IO.Path]::IsPathRooted($InputDir)) {
    [System.IO.Path]::GetFullPath($InputDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $InputDir))
}
if (-not (Test-Path $inputFullPath)) {
    throw "Input directory does not exist: $inputFullPath"
}

$backupFullPath = if (-not [string]::IsNullOrWhiteSpace($BackupFile)) {
    if ([System.IO.Path]::IsPathRooted($BackupFile)) {
        [System.IO.Path]::GetFullPath($BackupFile)
    } else {
        [System.IO.Path]::GetFullPath((Join-Path $inputFullPath $BackupFile))
    }
} else {
    $latest = Get-ChildItem -Path $inputFullPath -Filter "$Database-*.dump" |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1
    if ($null -eq $latest) {
        throw "No backup file found for $Database in $inputFullPath"
    }
    $latest.FullName
}

if (-not (Test-Path $backupFullPath)) {
    throw "Backup file does not exist: $backupFullPath"
}

$status = docker inspect --format='{{.State.Running}}' $Container 2>$null
if ($LASTEXITCODE -ne 0 -or $status -ne "true") {
    throw "PostgreSQL container '$Container' is not running. Start Docker Compose before restore."
}

$databaseExists = docker exec $Container psql -U $User -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$Database';"
if ($LASTEXITCODE -ne 0 -or ($databaseExists | Select-Object -First 1).Trim() -ne "1") {
    throw "Target database '$Database' does not exist in container '$Container'."
}

$containerPath = "/tmp/devhire-restore-$([guid]::NewGuid()).dump"
try {
    docker cp $backupFullPath "${Container}:$containerPath"
    if ($LASTEXITCODE -ne 0) {
        throw "docker cp failed for restore file"
    }

    docker exec $Container pg_restore -U $User -d $Database --clean --if-exists --exit-on-error --no-owner --no-acl $containerPath
    if ($LASTEXITCODE -ne 0) {
        throw "pg_restore failed for $Database"
    }

    [pscustomobject]@{
        status     = "passed"
        database   = $Database
        backupFile = $backupFullPath
        container  = $Container
    } | ConvertTo-Json -Depth 5
} finally {
    docker exec $Container rm -f $containerPath | Out-Null
}
