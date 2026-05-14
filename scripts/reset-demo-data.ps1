[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$PostgresUser = $(if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "devhire" }),
    [string]$PostgresPassword = $(if ($env:POSTGRES_PASSWORD) { $env:POSTGRES_PASSWORD } else { "devhire_local_password" }),
    [string]$OpenSearchUrl = $(if ($env:OPENSEARCH_URL) { $env:OPENSEARCH_URL } elseif ($env:OPENSEARCH_HOST_PORT) { "http://localhost:$env:OPENSEARCH_HOST_PORT" } else { "http://localhost:9200" }),
    [switch]$SkipOpenSearch,
    [switch]$KeepAiConversations,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Invoke-PostgresSql {
    param(
        [Parameter(Mandatory = $true)][string]$Database,
        [Parameter(Mandatory = $true)][string]$Sql
    )

    Write-Host "Resetting $Database demo rows..."
    if ($DryRun) {
        Write-Host $Sql
        return
    }

    docker compose exec -T -e "PGPASSWORD=$PostgresPassword" postgres `
        psql -U $PostgresUser -d $Database -v ON_ERROR_STOP=1 -c $Sql
    if ($LASTEXITCODE -ne 0) {
        throw "PostgreSQL reset failed for $Database"
    }
}

function Invoke-OpenSearchCleanup {
    if ($SkipOpenSearch) {
        Write-Host "Skipping OpenSearch cleanup."
        return
    }

    $body = @{
        query = @{
            bool = @{
                should = @(
                    @{ match_phrase_prefix = @{ title = "Senior Java Backend Engineer Smoke" } },
                    @{ match_phrase_prefix = @{ title = "Senior Java Assessment Smoke" } },
                    @{ match_phrase_prefix = @{ title = "Senior Java Assessment Debug" } },
                    @{ match_phrase_prefix = @{ title = "Senior Java Assessment Verification" } },
                    @{ match_phrase_prefix = @{ title = "Senior Java Backend Engineer k6" } },
                    @{ match_phrase_prefix = @{ title = "Senior Java Backend Engineer Verification" } },
                    @{ match_phrase_prefix = @{ title = "Senior Java Mailpit Verification" } },
                    @{ match_phrase_prefix = @{ title = "Senior Java Resilience Mail" } },
                    @{ match_phrase_prefix = @{ title = "Senior Java Chaos Mail" } }
                )
                minimum_should_match = 1
            }
        }
    } | ConvertTo-Json -Depth 10

    Write-Host "Resetting OpenSearch smoke documents at $OpenSearchUrl..."
    if ($DryRun) {
        Write-Host $body
        return
    }

    try {
        Invoke-RestMethod -Method Post -Uri "$OpenSearchUrl/devhire_jobs/_delete_by_query?conflicts=proceed&refresh=true" `
            -ContentType "application/json" -Body $body -TimeoutSec 20 | Out-Null
    } catch {
        Write-Warning "OpenSearch cleanup skipped or unavailable: $($_.Exception.Message)"
    }
}

$applicationSql = @'
DELETE FROM job_applications
WHERE job_title LIKE 'Senior Java Backend Engineer Smoke %'
   OR job_title LIKE 'Senior Java Assessment Smoke %'
   OR job_title LIKE 'Senior Java Assessment Debug %'
   OR job_title LIKE 'Senior Java Assessment Verification %'
   OR job_title LIKE 'Senior Java Backend Engineer k6 %'
   OR job_title LIKE 'Senior Java Backend Engineer Verification %'
   OR job_title LIKE 'Senior Java Mailpit Smoke %'
   OR job_title LIKE 'Senior Java Mailpit Verification %'
   OR job_title LIKE 'Senior Java Chaos Mail %'
   OR job_title LIKE 'Senior Java Resilience Mail %';
'@

$jobSql = @'
DELETE FROM outbox_events
WHERE payload::text ILIKE '%Senior Java Backend Engineer Smoke%'
   OR payload::text ILIKE '%Senior Java Assessment Smoke%'
   OR payload::text ILIKE '%Senior Java Assessment Debug%'
   OR payload::text ILIKE '%Senior Java Assessment Verification%'
   OR payload::text ILIKE '%Senior Java Backend Engineer k6%'
   OR payload::text ILIKE '%Senior Java Backend Engineer Verification%'
   OR payload::text ILIKE '%Senior Java Mailpit Smoke%'
   OR payload::text ILIKE '%Senior Java Mailpit Verification%'
   OR payload::text ILIKE '%Senior Java Chaos Mail%'
   OR payload::text ILIKE '%Senior Java Resilience Mail%';

DELETE FROM jobs
WHERE title LIKE 'Senior Java Backend Engineer Smoke %'
   OR title LIKE 'Senior Java Assessment Smoke %'
   OR title LIKE 'Senior Java Assessment Debug %'
   OR title LIKE 'Senior Java Assessment Verification %'
   OR title LIKE 'Senior Java Backend Engineer k6 %'
   OR title LIKE 'Senior Java Backend Engineer Verification %'
   OR title LIKE 'Senior Java Mailpit Smoke %'
   OR title LIKE 'Senior Java Mailpit Verification %'
   OR title LIKE 'Senior Java Chaos Mail %'
   OR title LIKE 'Senior Java Resilience Mail %';
'@

$companySql = @'
DELETE FROM outbox_events
WHERE payload::text ILIKE '%DevHire API Smoke%'
   OR payload::text ILIKE '%DevHire API Verification%'
   OR payload::text ILIKE '%DevHire Code Assessment Smoke%'
   OR payload::text ILIKE '%DevHire Code Assessment Debug%'
   OR payload::text ILIKE '%DevHire Code Assessment Verification%'
   OR payload::text ILIKE '%DevHire k6 Review%'
   OR payload::text ILIKE '%DevHire Performance Review%'
   OR payload::text ILIKE '%DevHire Email Smoke%'
   OR payload::text ILIKE '%DevHire Email Verification%'
   OR payload::text ILIKE '%DevHire Chaos Company%'
   OR payload::text ILIKE '%DevHire Chaos Mail%'
   OR payload::text ILIKE '%DevHire Resilience Company%'
   OR payload::text ILIKE '%DevHire Resilience Mail%';

DELETE FROM companies
WHERE name LIKE 'DevHire API Smoke %'
   OR name LIKE 'DevHire API Verification %'
   OR name LIKE 'DevHire Code Assessment Smoke %'
   OR name LIKE 'DevHire Code Assessment Debug %'
   OR name LIKE 'DevHire Code Assessment Verification %'
   OR name LIKE 'DevHire k6 Review %'
   OR name LIKE 'DevHire Performance Review %'
   OR name LIKE 'DevHire Email Smoke %'
   OR name LIKE 'DevHire Email Verification %'
   OR name LIKE 'DevHire Chaos Company %'
   OR name LIKE 'DevHire Chaos Mail %'
   OR name LIKE 'DevHire Resilience Company %'
   OR name LIKE 'DevHire Resilience Mail %';
'@

$notificationSql = @'
DELETE FROM notifications
WHERE title ILIKE '%Smoke%'
   OR message ILIKE '%Senior Java Backend Engineer Smoke%'
   OR message ILIKE '%Senior Java Assessment Smoke%'
   OR message ILIKE '%Senior Java Assessment Debug%'
   OR message ILIKE '%Senior Java Assessment Verification%'
   OR message ILIKE '%Ready for code assessment smoke%'
   OR message ILIKE '%Ready for code assessment verification%'
   OR message ILIKE '%Senior Java Backend Engineer k6%'
   OR message ILIKE '%Senior Java Backend Engineer Verification%'
   OR message ILIKE '%Senior Java Mailpit Smoke%'
   OR message ILIKE '%Senior Java Mailpit Verification%'
   OR message ILIKE '%Senior Java Chaos Mail%'
   OR message ILIKE '%Senior Java Resilience Mail%'
   OR message ILIKE '%Role-based k6 employer review smoke%'
   OR message ILIKE '%Role-based k6 candidate application verification%'
   OR message ILIKE '%Role-based performance verification%'
   OR message ILIKE '%Automated Gateway release verification%'
   OR message ILIKE '%Automated final verification%'
   OR message ILIKE '%Mailpit email verification%'
   OR message ILIKE '%mail resilience verification%';
'@

$auditSql = @'
DELETE FROM audit_logs
WHERE metadata::text ILIKE '%Smoke%'
   OR metadata::text ILIKE '%Automated Gateway smoke verification%'
   OR metadata::text ILIKE '%Automated Gateway release verification%'
   OR metadata::text ILIKE '%Automated code assessment smoke verification%'
   OR metadata::text ILIKE '%Automated code assessment release verification%'
   OR metadata::text ILIKE '%Senior Java Assessment Debug%'
   OR metadata::text ILIKE '%Senior Java Assessment Verification%'
   OR metadata::text ILIKE '%Role-based k6 employer review smoke%'
   OR metadata::text ILIKE '%Role-based k6 candidate application verification%'
   OR metadata::text ILIKE '%Role-based performance verification%'
   OR metadata::text ILIKE '%Senior Java Backend Engineer k6%'
   OR metadata::text ILIKE '%Senior Java Backend Engineer Verification%'
   OR metadata::text ILIKE '%Senior Java Mailpit Smoke%'
   OR metadata::text ILIKE '%Senior Java Mailpit Verification%'
   OR metadata::text ILIKE '%Senior Java Chaos Mail%'
   OR metadata::text ILIKE '%Senior Java Resilience Mail%'
   OR metadata::text ILIKE '%Mailpit email verification%'
   OR metadata::text ILIKE '%mail resilience verification%';
'@

$aiSql = @'
DELETE FROM outbox_events
WHERE aggregate_type = 'AI'
   OR event_type LIKE 'AI_%';

DELETE FROM ai_conversations;
'@

Push-Location $repoRoot
try {
    if ($PSCmdlet.ShouldProcess("DevHire local Docker databases", "delete generated smoke/demo rows")) {
        Invoke-PostgresSql -Database "devhire_application" -Sql $applicationSql
        Invoke-PostgresSql -Database "devhire_job" -Sql $jobSql
        Invoke-PostgresSql -Database "devhire_company" -Sql $companySql
        Invoke-PostgresSql -Database "devhire_notification" -Sql $notificationSql
        Invoke-PostgresSql -Database "devhire_audit" -Sql $auditSql
        if (-not $KeepAiConversations) {
            Invoke-PostgresSql -Database "devhire_ai" -Sql $aiSql
        }
        Invoke-OpenSearchCleanup
        Write-Host "DevHire demo reset completed."
    }
} finally {
    Pop-Location
}
