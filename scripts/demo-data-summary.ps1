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

function New-ExpectedAggregate {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][object[]]$Rows
    )

    [pscustomobject]@{
        Name = $Name
        Source = "migration formulas"
        Rows = $Rows
    }
}

function Get-ExpectedAggregates {
    $aggregates = @()
    $aggregates += New-ExpectedAggregate -Name "Companies by status" -Rows @(
            [pscustomobject]@{ Dimension = "APPROVED"; Count = 21; Evidence = "public job eligibility and employer dashboards" },
            [pscustomobject]@{ Dimension = "PENDING"; Count = 2; Evidence = "admin approval queue" },
            [pscustomobject]@{ Dimension = "REJECTED"; Count = 1; Evidence = "admin rejection path" }
        )
    $aggregates += New-ExpectedAggregate -Name "Jobs by status" -Rows @(
            [pscustomobject]@{ Dimension = "PUBLISHED"; Count = 150; Evidence = "public search, filters, pagination" },
            [pscustomobject]@{ Dimension = "PENDING_REVIEW"; Count = 15; Evidence = "admin job approval queue" },
            [pscustomobject]@{ Dimension = "CLOSED"; Count = 10; Evidence = "closed posting state" },
            [pscustomobject]@{ Dimension = "DRAFT"; Count = 3; Evidence = "employer draft state" },
            [pscustomobject]@{ Dimension = "REJECTED"; Count = 2; Evidence = "admin rejection path" }
        )
    $aggregates += New-ExpectedAggregate -Name "Applications by status" -Rows @(
            [pscustomobject]@{ Dimension = "SUBMITTED"; Count = 130; Evidence = "candidate submitted pipeline" },
            [pscustomobject]@{ Dimension = "REVIEWING"; Count = 33; Evidence = "employer screening queue" },
            [pscustomobject]@{ Dimension = "INTERVIEW"; Count = 27; Evidence = "interview stage dashboard" },
            [pscustomobject]@{ Dimension = "REJECTED"; Count = 19; Evidence = "rejection state and history" },
            [pscustomobject]@{ Dimension = "OFFER"; Count = 17; Evidence = "offer stage KPI" },
            [pscustomobject]@{ Dimension = "WITHDRAWN"; Count = 14; Evidence = "candidate withdrawal path" }
        )
    $aggregates += New-ExpectedAggregate -Name "Notifications by email status" -Rows @(
            [pscustomobject]@{ Dimension = "PENDING"; Count = 151; Evidence = "delivery backlog and unread pagination" },
            [pscustomobject]@{ Dimension = "SENT"; Count = 36; Evidence = "Mailpit/email success evidence" },
            [pscustomobject]@{ Dimension = "FAILED_RETRYABLE"; Count = 15; Evidence = "retry queue and alerting" },
            [pscustomobject]@{ Dimension = "FAILED_PERMANENT"; Count = 9; Evidence = "permanent failure handling" },
            [pscustomobject]@{ Dimension = "SKIPPED_NO_EMAIL"; Count = 9; Evidence = "fallback internal notification" }
        )
    $aggregates += New-ExpectedAggregate -Name "Top audit actions" -Rows @(
            [pscustomobject]@{ Dimension = "SEARCH_JOBS"; Count = 151; Evidence = "candidate search activity" },
            [pscustomobject]@{ Dimension = "LOGIN"; Count = 35; Evidence = "auth audit volume" },
            [pscustomobject]@{ Dimension = "CREATE_COMPANY"; Count = 28; Evidence = "employer onboarding audit" },
            [pscustomobject]@{ Dimension = "CREATE_JOB"; Count = 18; Evidence = "job authoring audit" },
            [pscustomobject]@{ Dimension = "APPROVE_COMPANY"; Count = 18; Evidence = "admin company approval audit" },
            [pscustomobject]@{ Dimension = "SUBMIT_APPLICATION"; Count = 13; Evidence = "candidate application audit" },
            [pscustomobject]@{ Dimension = "CHANGE_APPLICATION_STATUS"; Count = 7; Evidence = "pipeline transition audit" },
            [pscustomobject]@{ Dimension = "APPROVE_JOB"; Count = 6; Evidence = "admin job approval audit" },
            [pscustomobject]@{ Dimension = "AI_TOOL_EXECUTED"; Count = 4; Evidence = "AI assistant audit trail" }
        )
    $aggregates += New-ExpectedAggregate -Name "AI usage fallback" -Rows @(
            [pscustomobject]@{ Dimension = "fallback=true"; Count = 20; Evidence = "CI-safe Claude Haiku fallback and citation evidence" }
        )
    return $aggregates
}

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
    $expectedAggregates = @()
    if ($Aggregates) {
        $expectedAggregates = Get-ExpectedAggregates
    }
    if ($FromDocker -and $Aggregates) {
        $runtimeAggregates = Get-RuntimeAggregates
    }

    if ($Json) {
        [pscustomobject]@{
            ExpectedRows = $rows
            ExpectedAggregates = $expectedAggregates
            Aggregates = $runtimeAggregates
        } | ConvertTo-Json -Depth 8
    } else {
        $rows | Format-Table -AutoSize
        $total = ($rows | Measure-Object -Property PortfolioRows -Sum).Sum
        Write-Host ""
        Write-Host "Expected portfolio volume seed rows: $total"
        if ($expectedAggregates.Count -gt 0) {
            foreach ($aggregate in $expectedAggregates) {
                Write-Host ""
                Write-Host "Expected $($aggregate.Name)"
                $aggregate.Rows | Format-Table -AutoSize
            }
        }
        if ($runtimeAggregates.Count -gt 0) {
            foreach ($aggregate in $runtimeAggregates) {
                Write-Host ""
                Write-Host "Runtime $($aggregate.Name)"
                $aggregate.Rows | Format-Table -AutoSize
            }
        }
        if (-not $FromDocker -and -not $Aggregates) {
            Write-Host "Tip: add -Aggregates for expected distribution evidence, or add -FromDocker after 'docker compose up -d' to compare expected vs runtime table counts."
        } elseif (-not $FromDocker) {
            Write-Host "Tip: add -FromDocker after 'docker compose up -d' to compare expected vs runtime table counts."
        } elseif (-not $Aggregates) {
            Write-Host "Tip: add -Aggregates to show status distributions for runtime dashboards."
        }
    }
} finally {
    Pop-Location
}
