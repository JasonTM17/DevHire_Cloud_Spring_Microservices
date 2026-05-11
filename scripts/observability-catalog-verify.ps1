[CmdletBinding()]
param(
    [string]$OutputDir = "reports/observability-catalog"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputRoot = if ([System.IO.Path]::IsPathRooted($OutputDir)) {
    [System.IO.Path]::GetFullPath($OutputDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OutputDir))
}

function Read-TextOrEmpty {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (Test-Path $Path) {
        return Get-Content -Raw -Encoding UTF8 $Path
    }
    return ""
}

function Test-ContainsMetric {
    param(
        [Parameter(Mandatory = $true)][string]$Text,
        [Parameter(Mandatory = $true)][string]$Metric
    )

    return $Text -match [regex]::Escape($Metric)
}

$dashboardDir = Join-Path $repoRoot "infra/grafana/dashboards"
$dashboardFiles = @(
    "devhire-service-health.json",
    "devhire-recruitment-funnel.json",
    "devhire-event-reliability.json",
    "devhire-search-and-ai.json",
    "devhire-database-and-jvm.json",
    "devhire-slo-overview.json"
)

$prometheusRulesPath = Join-Path $repoRoot "infra/prometheus/rules/devhire-slo.yml"
$runtimeSmokePath = Join-Path $repoRoot "scripts/runtime-observability-smoke.ps1"
$rulesText = Read-TextOrEmpty -Path $prometheusRulesPath
$runtimeSmokeText = Read-TextOrEmpty -Path $runtimeSmokePath
$dashboardText = ""
foreach ($file in Get-ChildItem -Path $dashboardDir -Filter "*.json" -File -ErrorAction SilentlyContinue) {
    $dashboardText += "`n" + (Read-TextOrEmpty -Path $file.FullName)
}

$requiredMetrics = @(
    "devhire_gateway_requests_total",
    "devhire_gateway_request_latency_seconds",
    "devhire_gateway_rate_limited_total",
    "devhire_applications",
    "devhire_application_status_transitions",
    "devhire_notifications",
    "devhire_email_delivery",
    "devhire_outbox_backlog",
    "devhire_outbox_publish_failure_total",
    "devhire_audit_ingested",
    "devhire_job_search_requests_total",
    "devhire_job_search_latency_seconds",
    "devhire_ai_conversations",
    "devhire_ai_usage_events",
    "devhire_ai_fallback_total",
    "devhire_ai_chat_latency_seconds",
    "devhire_ai_provider_circuit_open",
    "devhire_code_assessments",
    "devhire_code_submissions",
    "devhire_code_grading_requests_total",
    "devhire_code_grading_latency_seconds",
    "devhire_code_grading_score",
    "devhire_code_review_risk_flags",
    "devhire_code_review_decisions_total",
    "devhire_code_runner_client_failures_total",
    "devhire_assessment_runner_requests_total",
    "devhire_assessment_runner_latency_seconds",
    "hikaricp_connections_active",
    "hikaricp_connections_max",
    "jvm_memory_used_bytes"
)

$runtimeSmokeRequired = @(
    "devhire_gateway_requests_total",
    "devhire_applications",
    "devhire_application_status_transitions",
    "devhire_notifications",
    "devhire_email_delivery",
    "devhire_audit_ingested",
    "devhire_job_search_requests_total",
    "devhire_job_search_latency_seconds",
    "devhire_ai_conversations",
    "devhire_ai_usage_events",
    "devhire_outbox_backlog"
)

$metricRows = @(
    foreach ($metric in $requiredMetrics) {
        $inRules = Test-ContainsMetric -Text $rulesText -Metric $metric
        $inDashboards = Test-ContainsMetric -Text $dashboardText -Metric $metric
        $inRuntimeSmoke = Test-ContainsMetric -Text $runtimeSmokeText -Metric $metric
        [pscustomobject]@{
            metric = $metric
            rules = $inRules
            dashboards = $inDashboards
            runtimeSmoke = $inRuntimeSmoke
            status = if ($inRules -or $inDashboards -or $inRuntimeSmoke) { "passed" } else { "failed" }
        }
    }
)

$dashboardRows = @(
    foreach ($dashboard in $dashboardFiles) {
        $path = Join-Path $dashboardDir $dashboard
        [pscustomobject]@{
            dashboard = $dashboard
            exists = Test-Path $path
            status = if (Test-Path $path) { "passed" } else { "failed" }
        }
    }
)

$runtimeSmokeRows = @(
    foreach ($metric in $runtimeSmokeRequired) {
        $present = Test-ContainsMetric -Text $runtimeSmokeText -Metric $metric
        [pscustomobject]@{
            metric = $metric
            runtimeSmoke = $present
            status = if ($present) { "passed" } else { "failed" }
        }
    }
)

$failedMetrics = @($metricRows | Where-Object { $_.status -ne "passed" })
$failedDashboards = @($dashboardRows | Where-Object { $_.status -ne "passed" })
$failedRuntimeSmoke = @($runtimeSmokeRows | Where-Object { $_.status -ne "passed" })
$overall = if ($failedMetrics.Count -eq 0 -and $failedDashboards.Count -eq 0 -and $failedRuntimeSmoke.Count -eq 0) {
    "passed"
} else {
    "failed"
}

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $outputRoot "observability-catalog-$stamp.json"
$mdPath = Join-Path $outputRoot "observability-catalog-$stamp.md"

$summary = [pscustomobject]@{
    status = $overall
    generatedAt = (Get-Date).ToString("o")
    requiredMetricCount = $requiredMetrics.Count
    dashboardCount = $dashboardFiles.Count
    runtimeSmokeMetricCount = $runtimeSmokeRequired.Count
    metrics = @($metricRows)
    dashboards = @($dashboardRows)
    runtimeSmoke = @($runtimeSmokeRows)
}
$summary | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# DevHire Observability Catalog Verification")
$lines.Add("")
$lines.Add("- Status: $overall")
$lines.Add("- Generated: $($summary.generatedAt)")
$lines.Add("- Required metrics: $($requiredMetrics.Count)")
$lines.Add("- Required dashboards: $($dashboardFiles.Count)")
$lines.Add("")
$lines.Add("## Metrics")
$lines.Add("")
$lines.Add("| Metric | Rules | Dashboards | Runtime smoke | Status |")
$lines.Add("|---|---:|---:|---:|---|")
foreach ($row in $metricRows) {
    $lines.Add("| $($row.metric) | $($row.rules) | $($row.dashboards) | $($row.runtimeSmoke) | $($row.status) |")
}
$lines.Add("")
$lines.Add("## Required Dashboards")
$lines.Add("")
$lines.Add("| Dashboard | Status |")
$lines.Add("|---|---|")
foreach ($row in $dashboardRows) {
    $lines.Add("| $($row.dashboard) | $($row.status) |")
}
$lines | Set-Content -Path $mdPath -Encoding UTF8

Write-Host "Observability catalog verification: $overall"
Write-Host "Reports:"
Write-Host "  $jsonPath"
Write-Host "  $mdPath"

if ($overall -ne "passed") {
    $missing = @(
        $failedMetrics | ForEach-Object { "metric:$($_.metric)" }
        $failedDashboards | ForEach-Object { "dashboard:$($_.dashboard)" }
        $failedRuntimeSmoke | ForEach-Object { "runtime-smoke:$($_.metric)" }
    )
    throw "Observability catalog verification failed: $($missing -join ', ')"
}
