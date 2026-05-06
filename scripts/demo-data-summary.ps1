[CmdletBinding()]
param(
    [string]$PostgresUser = $(if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "devhire" }),
    [string]$PostgresPassword = $(if ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "devhire_local_password" }),
    [switch]$FromDocker,
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

    if ($Json) {
        $rows | ConvertTo-Json -Depth 4
    } else {
        $rows | Format-Table -AutoSize
        $total = ($rows | Measure-Object -Property PortfolioRows -Sum).Sum
        Write-Host ""
        Write-Host "Expected portfolio volume seed rows: $total"
        if (-not $FromDocker) {
            Write-Host "Tip: add -FromDocker after 'docker compose up -d' to compare expected vs runtime table counts."
        }
    }
} finally {
    Pop-Location
}
