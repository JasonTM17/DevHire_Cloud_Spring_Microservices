[CmdletBinding()]
param(
    [string]$GatewayUrl = $(if ($env:E2E_GATEWAY_URL) { $env:E2E_GATEWAY_URL } else { "http://localhost:8080" }),
    [string]$ManifestPath = ".\docs\contracts\api-compatibility-manifest.json",
    [string]$OutputDir = ".\reports\api-compatibility",
    [int]$TimeoutSeconds = 120,
    [switch]$ManifestOnly,
    [switch]$SkipGatewayProbe
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$manifestFullPath = if ([System.IO.Path]::IsPathRooted($ManifestPath)) {
    [System.IO.Path]::GetFullPath($ManifestPath)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ManifestPath))
}

if (-not (Test-Path $manifestFullPath)) {
    throw "Missing API compatibility manifest: $manifestFullPath"
}

$manifest = Get-Content -Raw -Encoding UTF8 $manifestFullPath | ConvertFrom-Json
$outputFullPath = if ([System.IO.Path]::IsPathRooted($OutputDir)) {
    [System.IO.Path]::GetFullPath($OutputDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OutputDir))
}
New-Item -ItemType Directory -Force -Path $outputFullPath | Out-Null

function Assert-ManifestShape {
    param([Parameter(Mandatory = $true)]$Manifest)

    if (-not $Manifest.version) {
        throw "Manifest is missing version"
    }
    if (-not $Manifest.services -or $Manifest.services.Count -eq 0) {
        throw "Manifest is missing services"
    }

    $seen = @{}
    foreach ($service in $Manifest.services) {
        if (-not $service.name) {
            throw "A service entry is missing name"
        }
        if (-not $service.localPort) {
            throw "$($service.name) is missing localPort"
        }
        if (-not $service.endpoints -or $service.endpoints.Count -eq 0) {
            throw "$($service.name) has no endpoint contracts"
        }

        foreach ($endpoint in $service.endpoints) {
            foreach ($requiredProperty in @("method", "localPath", "surface")) {
                if (-not ($endpoint.PSObject.Properties.Name -contains $requiredProperty) -or -not $endpoint.$requiredProperty) {
                    throw "$($service.name) endpoint is missing $requiredProperty"
                }
            }

            $method = $endpoint.method.ToUpperInvariant()
            if (@("GET", "POST", "PUT", "PATCH", "DELETE") -notcontains $method) {
                throw "$($service.name) $($endpoint.localPath) uses unsupported method $method"
            }

            $key = "$($service.name)|$method|$($endpoint.localPath)"
            if ($seen.ContainsKey($key)) {
                throw "Duplicate endpoint contract: $key"
            }
            $seen[$key] = $true

            if ($endpoint.gatewayPath -and -not $endpoint.gatewayPath.StartsWith("/api/")) {
                throw "$($service.name) $method $($endpoint.localPath) gatewayPath must start with /api/"
            }
        }
    }

    if ($Manifest.asyncContracts) {
        foreach ($contract in $Manifest.asyncContracts) {
            foreach ($requiredProperty in @("topic", "eventType", "version", "consumers")) {
                if (-not ($contract.PSObject.Properties.Name -contains $requiredProperty) -or -not $contract.$requiredProperty) {
                    throw "Async contract is missing $requiredProperty"
                }
            }
        }
    }
}

function Wait-HttpOk {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$TimeoutSeconds = 120
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return
            }
        } catch {
            Start-Sleep -Seconds 2
        }
    } while ((Get-Date) -lt $deadline)

    throw "Timed out waiting for $Url"
}

function Get-ServiceUrl {
    param(
        [Parameter(Mandatory = $true)][string]$BaseGatewayUrl,
        [Parameter(Mandatory = $true)][int]$LocalPort
    )

    $builder = [System.UriBuilder]::new($BaseGatewayUrl)
    $builder.Port = $LocalPort
    $builder.Path = ""
    $builder.Query = ""
    return $builder.Uri.AbsoluteUri.TrimEnd("/")
}

function Assert-OpenApiEndpoint {
    param(
        [Parameter(Mandatory = $true)]$Document,
        [Parameter(Mandatory = $true)][string]$ServiceName,
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path
    )

    if (-not ($Document.PSObject.Properties.Name -contains "paths")) {
        throw "$ServiceName OpenAPI document has no paths object"
    }

    $pathProperty = $Document.paths.PSObject.Properties[$Path]
    if (-not $pathProperty) {
        throw "$ServiceName OpenAPI is missing $Path"
    }

    $methodName = $Method.ToLowerInvariant()
    if (-not $pathProperty.Value.PSObject.Properties[$methodName]) {
        throw "$ServiceName OpenAPI is missing $Method $Path"
    }
}

Assert-ManifestShape -Manifest $manifest

$runtimeResults = @()
if (-not $ManifestOnly) {
    if (-not $SkipGatewayProbe) {
        Wait-HttpOk -Url "$GatewayUrl/actuator/health/readiness" -TimeoutSeconds $TimeoutSeconds
    }

    foreach ($service in $manifest.services) {
        $serviceUrl = Get-ServiceUrl -BaseGatewayUrl $GatewayUrl -LocalPort $service.localPort
        Wait-HttpOk -Url "$serviceUrl/actuator/health/readiness" -TimeoutSeconds $TimeoutSeconds

        $docsUrl = "$serviceUrl/v3/api-docs"
        $document = Invoke-RestMethod -Uri $docsUrl -TimeoutSec 30

        foreach ($endpoint in $service.endpoints) {
            Assert-OpenApiEndpoint `
                -Document $document `
                -ServiceName $service.name `
                -Method $endpoint.method `
                -Path $endpoint.localPath
        }

        $snapshotPath = Join-Path $outputFullPath "$($service.name).openapi.json"
        $document | ConvertTo-Json -Depth 100 | Set-Content -Path $snapshotPath -Encoding UTF8

        $runtimeResults += [pscustomobject]@{
            service = $service.name
            docsUrl = $docsUrl
            endpointsChecked = $service.endpoints.Count
            snapshotPath = $snapshotPath
        }
    }
}

$summaryPath = Join-Path $outputFullPath "summary.json"
$summary = [pscustomobject]@{
    status = "passed"
    mode = $(if ($ManifestOnly) { "manifest-only" } else { "runtime-openapi" })
    manifestPath = $manifestFullPath
    manifestVersion = $manifest.version
    serviceCount = $manifest.services.Count
    endpointCount = @($manifest.services | ForEach-Object { $_.endpoints }).Count
    asyncContractCount = @($manifest.asyncContracts).Count
    runtimeResults = $runtimeResults
}
$summary | ConvertTo-Json -Depth 8 | Set-Content -Path $summaryPath -Encoding UTF8
$summary | ConvertTo-Json -Depth 8
