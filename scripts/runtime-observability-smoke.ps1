[CmdletBinding()]
param(
    [string]$GatewayUrl = "http://localhost:8080",
    [switch]$SkipTraffic,
    [string]$ApplicationUrl = "http://localhost:$($(if ($env:APPLICATION_HOST_PORT) { $env:APPLICATION_HOST_PORT } else { '8085' }))",
    [string]$NotificationUrl = "http://localhost:$($(if ($env:NOTIFICATION_HOST_PORT) { $env:NOTIFICATION_HOST_PORT } else { '8086' }))",
    [string]$AuditUrl = "http://localhost:$($(if ($env:AUDIT_HOST_PORT) { $env:AUDIT_HOST_PORT } else { '8087' }))",
    [string]$JobUrl = "http://localhost:$($(if ($env:JOB_HOST_PORT) { $env:JOB_HOST_PORT } else { '8084' }))",
    [string]$AiUrl = "http://localhost:$($(if ($env:AI_HOST_PORT) { $env:AI_HOST_PORT } else { '8088' }))"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-Step {
    param(
        [string]$Name,
        [scriptblock]$Action
    )
    Write-Host ""
    Write-Host "==> $Name"
    & $Action
    Write-Host "PASS $Name"
}

function Get-Metrics {
    param([string]$BaseUrl)

    $url = "$BaseUrl/actuator/prometheus"
    try {
        return (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15).Content
    } catch {
        throw "Unable to scrape Prometheus metrics from $url. $($_.Exception.Message)"
    }
}

function Assert-MetricExists {
    param(
        [string]$Content,
        [string]$MetricName
    )

    if ($Content -notmatch "(?m)^$([regex]::Escape($MetricName))(\{| )") {
        throw "Metric '$MetricName' was not found in scrape output."
    }
}

function Assert-NonZeroSample {
    param(
        [string]$Content,
        [string]$MetricName
    )

    $pattern = "(?m)^$([regex]::Escape($MetricName))(\{[^`r`n]*\})?\s+([0-9]+(\.[0-9]+)?)$"
    $matches = [regex]::Matches($Content, $pattern)
    foreach ($match in $matches) {
        if ([double]$match.Groups[3].Value -gt 0) {
            return
        }
    }
    throw "Metric '$MetricName' exists but no non-zero samples were found."
}

if (-not $SkipTraffic) {
    Invoke-Step "API smoke traffic for metrics" {
        & "$PSScriptRoot\api-smoke.ps1" -GatewayUrl $GatewayUrl
    }
    Invoke-Step "AI eval traffic for metrics" {
        & "$PSScriptRoot\ai-eval.ps1" -GatewayUrl $GatewayUrl
    }
}

$scrapes = @{
    application = Get-Metrics -BaseUrl $ApplicationUrl
    notification = Get-Metrics -BaseUrl $NotificationUrl
    audit = Get-Metrics -BaseUrl $AuditUrl
    job = Get-Metrics -BaseUrl $JobUrl
    ai = Get-Metrics -BaseUrl $AiUrl
}

Invoke-Step "application domain metrics" {
    Assert-MetricExists -Content $scrapes.application -MetricName "devhire_applications_total"
    Assert-NonZeroSample -Content $scrapes.application -MetricName "devhire_applications_total"
    Assert-MetricExists -Content $scrapes.application -MetricName "devhire_application_status_transitions_total"
    Assert-NonZeroSample -Content $scrapes.application -MetricName "devhire_application_status_transitions_total"
}

Invoke-Step "notification delivery metrics" {
    Assert-MetricExists -Content $scrapes.notification -MetricName "devhire_notifications_total"
    Assert-NonZeroSample -Content $scrapes.notification -MetricName "devhire_notifications_total"
    Assert-MetricExists -Content $scrapes.notification -MetricName "devhire_email_delivery_total"
    Assert-NonZeroSample -Content $scrapes.notification -MetricName "devhire_email_delivery_total"
}

Invoke-Step "audit ingestion metrics" {
    Assert-MetricExists -Content $scrapes.audit -MetricName "devhire_audit_ingested_total"
    Assert-NonZeroSample -Content $scrapes.audit -MetricName "devhire_audit_ingested_total"
}

Invoke-Step "job search metrics" {
    Assert-MetricExists -Content $scrapes.job -MetricName "devhire_job_search_requests_total"
    Assert-MetricExists -Content $scrapes.job -MetricName "devhire_job_search_latency_seconds_count"
}

Invoke-Step "AI usage metrics" {
    Assert-MetricExists -Content $scrapes.ai -MetricName "devhire_ai_conversations_total"
    Assert-NonZeroSample -Content $scrapes.ai -MetricName "devhire_ai_conversations_total"
    Assert-MetricExists -Content $scrapes.ai -MetricName "devhire_ai_usage_events_total"
    Assert-NonZeroSample -Content $scrapes.ai -MetricName "devhire_ai_usage_events_total"
}

Invoke-Step "outbox backlog metric surface" {
    foreach ($service in @("application", "notification", "job", "ai")) {
        Assert-MetricExists -Content $scrapes.$service -MetricName "devhire_outbox_backlog"
    }
}

Write-Host ""
Write-Host "Runtime observability smoke passed: custom domain metrics are present and seeded with non-zero recruitment data."
