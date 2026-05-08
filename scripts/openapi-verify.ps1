[CmdletBinding()]
param(
    [string]$GatewayUrl = $(if ($env:E2E_GATEWAY_URL) { $env:E2E_GATEWAY_URL } else { "http://localhost:8080" }),
    [string]$OutputDir = ".\reports\openapi",
    [int]$TimeoutSeconds = 180,
    [switch]$SkipGatewayProbe
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputFullPath = if ([System.IO.Path]::IsPathRooted($OutputDir)) {
    [System.IO.Path]::GetFullPath($OutputDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OutputDir))
}
New-Item -ItemType Directory -Force -Path $outputFullPath | Out-Null

function Wait-HttpOk {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$TimeoutSeconds = 180
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return
            }
        } catch {
            Start-Sleep -Seconds 3
        }
    } while ((Get-Date) -lt $deadline)

    throw "Timed out waiting for $Url"
}

function Get-ServiceUrl {
    param(
        [Parameter(Mandatory = $true)][string]$BaseGatewayUrl,
        [Parameter(Mandatory = $true)][int]$PortOffset
    )

    $builder = [System.UriBuilder]::new($BaseGatewayUrl)
    $builder.Port = $builder.Port + $PortOffset
    $builder.Path = ""
    $builder.Query = ""
    return $builder.Uri.AbsoluteUri.TrimEnd("/")
}

function Assert-OpenApiPaths {
    param(
        [Parameter(Mandatory = $true)][string]$ServiceName,
        [Parameter(Mandatory = $true)]$Document,
        [Parameter(Mandatory = $true)][string[]]$ExpectedPaths
    )

    if (-not ($Document.PSObject.Properties.Name -contains "paths")) {
        throw "$ServiceName OpenAPI document does not contain paths"
    }

    $actualPaths = @($Document.paths.PSObject.Properties.Name)
    foreach ($expectedPath in $ExpectedPaths) {
        if ($actualPaths -notcontains $expectedPath) {
            throw "$ServiceName OpenAPI missing expected path '$expectedPath'. Actual paths: $($actualPaths -join ', ')"
        }
    }
}

$services = @(
    @{
        name = "auth-service"
        portOffset = 1
        expectedPaths = @("/auth/register", "/auth/login", "/auth/refresh", "/auth/logout", "/auth/me")
    },
    @{
        name = "user-service"
        portOffset = 2
        expectedPaths = @("/users/me", "/users/{id}")
    },
    @{
        name = "company-service"
        portOffset = 3
        expectedPaths = @("/companies", "/companies/{id}", "/companies/slug/{slug}", "/employer/companies", "/admin/companies/{id}/approve", "/admin/companies/{id}/reject")
    },
    @{
        name = "job-service"
        portOffset = 4
        expectedPaths = @("/jobs", "/jobs/{id}", "/jobs/{id}/submit-review", "/admin/jobs", "/admin/jobs/{id}/approve", "/admin/jobs/{id}/reject", "/jobs/{id}/close")
    },
    @{
        name = "application-service"
        portOffset = 5
        expectedPaths = @("/jobs/{jobId}/applications", "/applications/me", "/employer/jobs/{jobId}/applications", "/applications/{id}/status", "/applications/{id}/withdraw", "/candidate/code-assessments", "/candidate/code-assessments/{id}", "/candidate/code-assessments/{id}/submissions", "/employer/code-assessments", "/employer/code-assessments/{id}", "/employer/code-assessments/{id}/review", "/admin/code-assessments/summary")
    },
    @{
        name = "notification-service"
        portOffset = 6
        expectedPaths = @("/notifications", "/notifications/{id}/read", "/notifications/read-all")
    },
    @{
        name = "audit-service"
        portOffset = 7
        expectedPaths = @("/admin/audit-logs")
    },
    @{
        name = "ai-service"
        portOffset = 8
        expectedPaths = @("/ai/chat", "/ai/chat/stream", "/ai/conversations", "/ai/conversations/{id}", "/admin/ai/knowledge/reindex", "/admin/ai/provider/status")
    }
)

if (-not $SkipGatewayProbe) {
    Wait-HttpOk -Url "$GatewayUrl/actuator/health/readiness" -TimeoutSeconds $TimeoutSeconds
}

$results = @()
foreach ($service in $services) {
    $serviceUrl = Get-ServiceUrl -BaseGatewayUrl $GatewayUrl -PortOffset $service.portOffset
    Wait-HttpOk -Url "$serviceUrl/actuator/health/readiness" -TimeoutSeconds $TimeoutSeconds

    $docsUrl = "$serviceUrl/v3/api-docs"
    $document = Invoke-RestMethod -Uri $docsUrl -TimeoutSec 30
    Assert-OpenApiPaths -ServiceName $service.name -Document $document -ExpectedPaths $service.expectedPaths

    $snapshotPath = Join-Path $outputFullPath "$($service.name).json"
    $document | ConvertTo-Json -Depth 100 | Set-Content -Path $snapshotPath -Encoding UTF8

    $results += [pscustomobject]@{
        service       = $service.name
        docsUrl       = $docsUrl
        snapshotPath  = $snapshotPath
        expectedPaths = $service.expectedPaths.Count
    }
}

[pscustomobject]@{
    status     = "passed"
    gatewayUrl = $GatewayUrl
    outputDir  = $outputFullPath
    services   = $results
} | ConvertTo-Json -Depth 8
