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
            match_phrase_prefix = @{
                title = "Senior Java Backend Engineer Smoke"
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
WHERE job_title LIKE 'Senior Java Backend Engineer Smoke %';
'@

$jobSql = @'
DELETE FROM outbox_events
WHERE payload::text ILIKE '%Senior Java Backend Engineer Smoke%';

DELETE FROM jobs
WHERE title LIKE 'Senior Java Backend Engineer Smoke %';
'@

$companySql = @'
DELETE FROM outbox_events
WHERE payload::text ILIKE '%DevHire API Smoke%';

DELETE FROM companies
WHERE name LIKE 'DevHire API Smoke %';
'@

$notificationSql = @'
DELETE FROM notifications
WHERE title ILIKE '%Smoke%'
   OR message ILIKE '%Senior Java Backend Engineer Smoke%'
   OR message ILIKE '%Automated final verification%';
'@

$auditSql = @'
DELETE FROM audit_logs
WHERE metadata::text ILIKE '%Smoke%'
   OR metadata::text ILIKE '%Automated Gateway smoke verification%';
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
