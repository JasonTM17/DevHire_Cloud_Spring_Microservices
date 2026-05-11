[CmdletBinding()]
param(
    [string]$GatewayUrl = "http://localhost:8080",
    [switch]$SkipTraffic,
    [string]$ApplicationUrl = "http://localhost:$($(if ($env:APPLICATION_HOST_PORT) { $env:APPLICATION_HOST_PORT } else { '8085' }))",
    [string]$NotificationUrl = "http://localhost:$($(if ($env:NOTIFICATION_HOST_PORT) { $env:NOTIFICATION_HOST_PORT } else { '8086' }))",
    [string]$AuditUrl = "http://localhost:$($(if ($env:AUDIT_HOST_PORT) { $env:AUDIT_HOST_PORT } else { '8087' }))",
    [string]$JobUrl = "http://localhost:$($(if ($env:JOB_HOST_PORT) { $env:JOB_HOST_PORT } else { '8084' }))",
    [string]$AiUrl = "http://localhost:$($(if ($env:AI_HOST_PORT) { $env:AI_HOST_PORT } else { '8088' }))",
    [string]$AssessmentRunnerUrl = "http://localhost:$($(if ($env:ASSESSMENT_RUNNER_HOST_PORT) { $env:ASSESSMENT_RUNNER_HOST_PORT } else { '8089' }))"
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

    $pattern = "(?m)^$([regex]::Escape($MetricName))(\{[^`r`n]*\})?\s+(?<value>[0-9]+(\.[0-9]+)?)\s*$"
    $matches = [regex]::Matches($Content, $pattern)
    foreach ($match in $matches) {
        if ([double]$match.Groups["value"].Value -gt 0) {
            return
        }
    }
    throw "Metric '$MetricName' exists but no non-zero samples were found."
}

function Select-MetricName {
    param(
        [string]$Content,
        [string[]]$MetricNames
    )

    foreach ($metricName in $MetricNames) {
        if ($Content -match "(?m)^$([regex]::Escape($metricName))(\{| )") {
            return $metricName
        }
    }
    throw "None of the expected metrics were found: $($MetricNames -join ', ')"
}

function Set-PortEnvFromUrl {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Url
    )

    $uri = [Uri]$Url
    if ($uri.Port -gt 0) {
        [Environment]::SetEnvironmentVariable($Name, [string]$uri.Port, "Process")
    }
}

Set-PortEnvFromUrl -Name "GATEWAY_HOST_PORT" -Url $GatewayUrl
Set-PortEnvFromUrl -Name "APPLICATION_HOST_PORT" -Url $ApplicationUrl
Set-PortEnvFromUrl -Name "NOTIFICATION_HOST_PORT" -Url $NotificationUrl
Set-PortEnvFromUrl -Name "AUDIT_HOST_PORT" -Url $AuditUrl
Set-PortEnvFromUrl -Name "JOB_HOST_PORT" -Url $JobUrl
Set-PortEnvFromUrl -Name "AI_HOST_PORT" -Url $AiUrl
Set-PortEnvFromUrl -Name "ASSESSMENT_RUNNER_HOST_PORT" -Url $AssessmentRunnerUrl

if (-not $SkipTraffic) {
    Invoke-Step "API smoke traffic for metrics" {
        & "$PSScriptRoot\api-smoke.ps1" -GatewayUrl $GatewayUrl
    }
    Invoke-Step "AI eval traffic for metrics" {
        & "$PSScriptRoot\ai-eval.ps1" -GatewayUrl $GatewayUrl
    }
}

$scrapes = @{
    gateway = Get-Metrics -BaseUrl $GatewayUrl
    application = Get-Metrics -BaseUrl $ApplicationUrl
    notification = Get-Metrics -BaseUrl $NotificationUrl
    audit = Get-Metrics -BaseUrl $AuditUrl
    job = Get-Metrics -BaseUrl $JobUrl
    ai = Get-Metrics -BaseUrl $AiUrl
    runner = Get-Metrics -BaseUrl $AssessmentRunnerUrl
}

Invoke-Step "gateway route metrics" {
    if ($SkipTraffic) {
        if ($scrapes.gateway -match "(?m)^devhire_gateway_requests_total(\{| )") {
            Assert-MetricExists -Content $scrapes.gateway -MetricName "devhire_gateway_requests_total"
            Assert-MetricExists -Content $scrapes.gateway -MetricName "devhire_gateway_request_latency_seconds_count"
        } else {
            Write-Host "Gateway custom route metrics are traffic-driven; skipping non-zero assertion because -SkipTraffic was used."
        }
    } else {
        Assert-MetricExists -Content $scrapes.gateway -MetricName "devhire_gateway_requests_total"
        Assert-NonZeroSample -Content $scrapes.gateway -MetricName "devhire_gateway_requests_total"
        Assert-MetricExists -Content $scrapes.gateway -MetricName "devhire_gateway_request_latency_seconds_count"
        Assert-NonZeroSample -Content $scrapes.gateway -MetricName "devhire_gateway_request_latency_seconds_count"
    }
}

Invoke-Step "application domain metrics" {
    $applicationsMetric = Select-MetricName -Content $scrapes.application -MetricNames @(
        "devhire_applications_total",
        "devhire_applications"
    )
    $transitionsMetric = Select-MetricName -Content $scrapes.application -MetricNames @(
        "devhire_application_status_transitions_total",
        "devhire_application_status_transitions"
    )
    Assert-NonZeroSample -Content $scrapes.application -MetricName $applicationsMetric
    Assert-NonZeroSample -Content $scrapes.application -MetricName $transitionsMetric
    Assert-MetricExists -Content $scrapes.application -MetricName "devhire_code_assessments"
    Assert-NonZeroSample -Content $scrapes.application -MetricName "devhire_code_assessments"
}

Invoke-Step "notification delivery metrics" {
    $notificationsMetric = Select-MetricName -Content $scrapes.notification -MetricNames @(
        "devhire_notifications_total",
        "devhire_notifications"
    )
    $emailDeliveryMetric = Select-MetricName -Content $scrapes.notification -MetricNames @(
        "devhire_email_delivery_total",
        "devhire_email_delivery"
    )
    Assert-NonZeroSample -Content $scrapes.notification -MetricName $notificationsMetric
    Assert-NonZeroSample -Content $scrapes.notification -MetricName $emailDeliveryMetric
}

Invoke-Step "audit ingestion metrics" {
    $auditMetric = Select-MetricName -Content $scrapes.audit -MetricNames @(
        "devhire_audit_ingested_total",
        "devhire_audit_ingested"
    )
    Assert-NonZeroSample -Content $scrapes.audit -MetricName $auditMetric
}

Invoke-Step "job search metrics" {
    Assert-MetricExists -Content $scrapes.job -MetricName "devhire_job_search_requests_total"
    Assert-MetricExists -Content $scrapes.job -MetricName "devhire_job_search_latency_seconds_count"
}

Invoke-Step "AI usage metrics" {
    $aiConversationsMetric = Select-MetricName -Content $scrapes.ai -MetricNames @(
        "devhire_ai_conversations_total",
        "devhire_ai_conversations"
    )
    $aiUsageMetric = Select-MetricName -Content $scrapes.ai -MetricNames @(
        "devhire_ai_usage_events_total",
        "devhire_ai_usage_events"
    )
    Assert-NonZeroSample -Content $scrapes.ai -MetricName $aiConversationsMetric
    Assert-NonZeroSample -Content $scrapes.ai -MetricName $aiUsageMetric
}

Invoke-Step "assessment runner metrics" {
    Assert-MetricExists -Content $scrapes.runner -MetricName "devhire_assessment_runner_queue_depth"
    Assert-MetricExists -Content $scrapes.runner -MetricName "devhire_assessment_runner_fail_closed"
    Assert-MetricExists -Content $scrapes.runner -MetricName "devhire_assessment_runner_judge0_configured"
    if ($scrapes.runner -match "(?m)^devhire_assessment_runner_requests_total(\{| )") {
        Assert-MetricExists -Content $scrapes.runner -MetricName "devhire_assessment_runner_requests_total"
        Assert-MetricExists -Content $scrapes.runner -MetricName "devhire_assessment_runner_latency_seconds_count"
    } else {
        Write-Host "Assessment runner request metrics are traffic-driven; surface-only checks passed."
    }
}

Invoke-Step "outbox backlog metric surface" {
    foreach ($service in @("application", "notification", "job", "ai")) {
        Assert-MetricExists -Content $scrapes.$service -MetricName "devhire_outbox_backlog"
    }
}

Write-Host ""
Write-Host "Runtime observability smoke passed: custom domain metrics and assessment runner surfaces are present."
