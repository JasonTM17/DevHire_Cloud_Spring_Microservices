[CmdletBinding()]
param(
    [string[]]$Services = @("auth-service", "user-service", "company-service", "job-service", "application-service", "notification-service", "audit-service", "ai-service"),
    [string]$PostgresUser = $(if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "devhire" }),
    [string]$PostgresPassword = $(if ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "devhire_local_password" }),
    [switch]$KeepDatabases,
    [switch]$SkipStart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runId = (Get-Date).ToString("yyyyMMddHHmmss")

$serviceCatalog = @{
    "auth-service" = @{
        Database = "devhire_smoke_auth_$runId"
        MigrationPath = "auth-service/src/main/resources/db/migration"
        CountSql = "SELECT count(*) FROM user_accounts;"
        MinimumRows = 75
    }
    "user-service" = @{
        Database = "devhire_smoke_user_$runId"
        MigrationPath = "user-service/src/main/resources/db/migration"
        CountSql = "SELECT count(*) FROM user_profiles;"
        MinimumRows = 78
    }
    "company-service" = @{
        Database = "devhire_smoke_company_$runId"
        MigrationPath = "company-service/src/main/resources/db/migration"
        CountSql = "SELECT count(*) FROM companies;"
        MinimumRows = 27
    }
    "job-service" = @{
        Database = "devhire_smoke_job_$runId"
        MigrationPath = "job-service/src/main/resources/db/migration"
        CountSql = "SELECT count(*) FROM jobs;"
        MinimumRows = 190
    }
    "application-service" = @{
        Database = "devhire_smoke_application_$runId"
        MigrationPath = "application-service/src/main/resources/db/migration"
        CountSql = "SELECT count(*) FROM job_applications;"
        MinimumRows = 243
    }
    "notification-service" = @{
        Database = "devhire_smoke_notification_$runId"
        MigrationPath = "notification-service/src/main/resources/db/migration"
        CountSql = "SELECT count(*) FROM notifications;"
        MinimumRows = 223
    }
    "audit-service" = @{
        Database = "devhire_smoke_audit_$runId"
        MigrationPath = "audit-service/src/main/resources/db/migration"
        CountSql = "SELECT count(*) FROM audit_logs;"
        MinimumRows = 284
    }
    "ai-service" = @{
        Database = "devhire_smoke_ai_$runId"
        MigrationPath = "ai-service/src/main/resources/db/migration"
        CountSql = "SELECT count(*) FROM ai_conversations;"
        MinimumRows = 20
    }
}

function Invoke-ComposePostgres {
    param(
        [string]$Database,
        [string]$Command,
        [string]$InputSql
    )

    $arguments = @(
        "compose", "exec", "-T",
        "-e", "PGPASSWORD=$PostgresPassword",
        "postgres",
        "psql", "-U", $PostgresUser, "-d", $Database, "-v", "ON_ERROR_STOP=1"
    )
    if ($Command) {
        $arguments += @("-c", $Command)
    } else {
        $arguments += @("-f", "-")
    }

    if ($InputSql) {
        $InputSql | docker @arguments 2>$null | Out-Null
    } else {
        docker @arguments 2>$null | Out-Null
    }
    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL command failed for database '$Database'."
    }
}

function Invoke-ScalarSql {
    param(
        [string]$Database,
        [string]$Sql
    )

    $result = docker compose exec -T -e "PGPASSWORD=$PostgresPassword" postgres `
        psql -U $PostgresUser -d $Database -t -A -v ON_ERROR_STOP=1 -c $Sql
    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL scalar query failed for database '$Database'."
    }
    return [int]($result | Select-Object -First 1)
}

function Wait-Postgres {
    $deadline = (Get-Date).AddSeconds(90)
    do {
        docker compose exec -T -e "PGPASSWORD=$PostgresPassword" postgres `
            psql -U $PostgresUser -d postgres -t -A -c "SELECT 1;" | Out-Null
        if ($LASTEXITCODE -eq 0) {
            return
        }
        if ((Get-Date) -ge $deadline) {
            throw "PostgreSQL did not become ready within 90 seconds."
        }
        Start-Sleep -Seconds 2
    } while ($true)
}

function Assert-DockerAvailable {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & docker version --format "{{.Server.Version}}" 2>$null | Out-Null
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }

    if ($exitCode -ne 0) {
        throw "Docker daemon is not available. Start Docker Desktop, then rerun migration smoke. Use 'mvn -T1 clean verify' for non-Docker compile/test gates."
    }
}

Push-Location $repoRoot
try {
    Assert-DockerAvailable

    if (-not $SkipStart) {
        docker compose up -d postgres
        if ($LASTEXITCODE -ne 0) {
            throw "Unable to start postgres container."
        }
    }
    Wait-Postgres

    $results = foreach ($service in $Services) {
        if (-not $serviceCatalog.ContainsKey($service)) {
            throw "Unknown service '$service'. Known services: $($serviceCatalog.Keys -join ', ')"
        }

        $config = $serviceCatalog[$service]
        $database = $config.Database
        $migrationRoot = Join-Path $repoRoot $config.MigrationPath
        $migrations = Get-ChildItem -Path $migrationRoot -Filter "*.sql" | Sort-Object Name
        if (-not $migrations) {
            throw "No SQL migrations found for $service in $migrationRoot"
        }

        Write-Host ""
        Write-Host "==> $service migration smoke ($database)"
        Invoke-ComposePostgres -Database "postgres" -Command "CREATE DATABASE $database;"

        foreach ($migration in $migrations) {
            Write-Host "Applying $($migration.Name)"
            $sql = Get-Content -Raw -Encoding UTF8 -LiteralPath $migration.FullName
            Invoke-ComposePostgres -Database $database -InputSql $sql
        }

        $rows = Invoke-ScalarSql -Database $database -Sql $config.CountSql
        if ($rows -lt [int]$config.MinimumRows) {
            throw "$service migration smoke expected at least $($config.MinimumRows) rows, got $rows"
        }

        if (-not $KeepDatabases) {
            Invoke-ComposePostgres -Database "postgres" -Command "DROP DATABASE $database WITH (FORCE);"
        }

        [pscustomobject]@{
            Service = $service
            Database = $database
            Migrations = $migrations.Count
            Rows = $rows
            MinimumRows = $config.MinimumRows
        }
    }

    Write-Host ""
    $results | Format-Table -AutoSize
    Write-Host "Migration smoke completed for $(@($results).Count) service databases."
} finally {
    Pop-Location
}
