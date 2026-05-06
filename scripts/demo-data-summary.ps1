[CmdletBinding()]
param(
    [string]$PostgresUser = $(if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "devhire" }),
    [string]$PostgresPassword = $(if ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "devhire_local_password" }),
    [switch]$FromDocker,
    [switch]$Aggregates,
    [switch]$Json
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$expected = @(
    [pscustomobject]@{ Service = "auth-service"; Database = "devhire_auth"; Table = "user_accounts"; PortfolioRows = 72; Purpose = "12 employers and 60 candidates for RBAC/login scale" },
    [pscustomobject]@{ Service = "user-service"; Database = "devhire_user"; Table = "user_profiles"; PortfolioRows = 72; Purpose = "candidate/employer profile search and dashboard realism" },
    [pscustomobject]@{ Service = "company-service"; Database = "devhire_company"; Table = "companies"; PortfolioRows = 24; Purpose = "approved, pending, and rejected company review states" },
    [pscustomobject]@{ Service = "job-service"; Database = "devhire_job"; Table = "jobs"; PortfolioRows = 180; Purpose = "published/searchable jobs plus review, draft, closed, rejected states" },
    [pscustomobject]@{ Service = "application-service"; Database = "devhire_application"; Table = "job_applications"; PortfolioRows = 240; Purpose = "candidate pipeline, duplicate-prevention, and status history volume" },
    [pscustomobject]@{ Service = "notification-service"; Database = "devhire_notification"; Table = "notifications"; PortfolioRows = 220; Purpose = "unread counts, email retry states, and notification pagination" },
    [pscustomobject]@{ Service = "audit-service"; Database = "devhire_audit"; Table = "audit_logs"; PortfolioRows = 280; Purpose = "admin audit filtering by actor, action, resource, and date" },
    [pscustomobject]@{ Service = "ai-service"; Database = "devhire_ai"; Table = "ai_conversations"; PortfolioRows = 20; Purpose = "Claude assistant conversation history and usage evidence" }
)

function Invoke-ScalarSql {
    param(
        [Parameter(Mandatory = $true)][string]$Database,
        [Parameter(Mandatory = $true)][string]$Sql
    )

    $result = docker compose exec -T -e "PGPASSWORD=$PostgresPassword" postgres `
        psql -U $PostgresUser -d $Database -t -A -v ON_ERROR_STOP=1 -c $Sql
    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL query failed for $Database"
    }
    return [int]($result | Select-Object -First 1)
}

function Invoke-TableSql {
    param(
        [Parameter(Mandatory = $true)][string]$Database,
        [Parameter(Mandatory = $true)][string]$Sql,
        [Parameter(Mandatory = $true)][string[]]$Columns
    )

    $result = docker compose exec -T -e "PGPASSWORD=$PostgresPassword" postgres `
        psql -U $PostgresUser -d $Database -t -A -F "|" -v ON_ERROR_STOP=1 -c $Sql
    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL aggregate query failed for $Database"
    }
    foreach ($line in $result) {
        if (-not $line.Trim()) {
            continue
        }
        $values = $line -split "\|", $Columns.Count
        $object = [ordered]@{}
        for ($i = 0; $i -lt $Columns.Count; $i++) {
            $object[$Columns[$i]] = $values[$i]
        }
        [pscustomobject]$object
    }
}

function Get-RuntimeAggregates {
    @(
        [pscustomobject]@{
            Name = "Companies by status"
            Rows = @(Invoke-TableSql -Database "devhire_company" -Columns @("status", "count") -Sql "SELECT status, count(*) FROM companies GROUP BY status ORDER BY status;")
        },
        [pscustomobject]@{
            Name = "Jobs by status"
            Rows = @(Invoke-TableSql -Database "devhire_job" -Columns @("status", "count") -Sql "SELECT status, count(*) FROM jobs GROUP BY status ORDER BY status;")
        },
        [pscustomobject]@{
            Name = "Applications by status"
            Rows = @(Invoke-TableSql -Database "devhire_application" -Columns @("status", "count") -Sql "SELECT status, count(*) FROM job_applications GROUP BY status ORDER BY status;")
        },
        [pscustomobject]@{
            Name = "Notifications by email status"
            Rows = @(Invoke-TableSql -Database "devhire_notification" -Columns @("email_status", "count") -Sql "SELECT email_status, count(*) FROM notifications GROUP BY email_status ORDER BY email_status;")
        },
        [pscustomobject]@{
            Name = "Top audit actions"
            Rows = @(Invoke-TableSql -Database "devhire_audit" -Columns @("action", "count") -Sql "SELECT action, count(*) FROM audit_logs GROUP BY action ORDER BY count(*) DESC, action LIMIT 12;")
        },
        [pscustomobject]@{
            Name = "AI usage"
            Rows = @(Invoke-TableSql -Database "devhire_ai" -Columns @("fallback", "count", "avg_latency_ms") -Sql "SELECT fallback::text, count(*), round(avg(latency_ms))::int FROM ai_usage_events GROUP BY fallback ORDER BY fallback;")
        }
    )
}

Push-Location $repoRoot
try {
    $rows = foreach ($item in $expected) {
        $actual = $null
        if ($FromDocker) {
            $actual = Invoke-ScalarSql -Database $item.Database -Sql "SELECT count(*) FROM $($item.Table);"
        }
        [pscustomobject]@{
            Service = $item.Service
            Database = $item.Database
            Table = $item.Table
            PortfolioRows = $item.PortfolioRows
            RuntimeRows = $actual
            Purpose = $item.Purpose
        }
    }

    $runtimeAggregates = @()
    if ($FromDocker -and $Aggregates) {
        $runtimeAggregates = Get-RuntimeAggregates
    }

    if ($Json) {
        [pscustomobject]@{
            ExpectedRows = $rows
            Aggregates = $runtimeAggregates
        } | ConvertTo-Json -Depth 8
    } else {
        $rows | Format-Table -AutoSize
        $total = ($rows | Measure-Object -Property PortfolioRows -Sum).Sum
        Write-Host ""
        Write-Host "Expected portfolio volume seed rows: $total"
        if ($runtimeAggregates.Count -gt 0) {
            foreach ($aggregate in $runtimeAggregates) {
                Write-Host ""
                Write-Host $aggregate.Name
                $aggregate.Rows | Format-Table -AutoSize
            }
        }
        if (-not $FromDocker) {
            Write-Host "Tip: add -FromDocker after 'docker compose up -d' to compare expected vs runtime table counts."
        } elseif (-not $Aggregates) {
            Write-Host "Tip: add -Aggregates to show status distributions for runtime dashboards."
        }
    }
} finally {
    Pop-Location
}
