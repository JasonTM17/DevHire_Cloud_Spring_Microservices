[CmdletBinding()]
param(
    [string]$Namespace = $(if ($env:DOCKERHUB_NAMESPACE) { $env:DOCKERHUB_NAMESPACE } else { "nguyenson1710" }),
    [string[]]$Tags = @("v0.6.0-preview"),
    [string[]]$Services = @(
        "api-gateway",
        "auth-service",
        "user-service",
        "company-service",
        "job-service",
        "application-service",
        "notification-service",
        "audit-service",
        "ai-service",
        "assessment-runner-service",
        "frontend"
    )
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$results = foreach ($tag in $Tags) {
    foreach ($service in $Services) {
        $image = "docker.io/$Namespace/devhire-cloud-$service`:$tag"
        $inspect = docker buildx imagetools inspect $image 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Docker Hub image not found or not readable: $image"
        }

        $digestLine = ($inspect | Select-String -Pattern '^Digest:\s+sha256:[a-f0-9]+' | Select-Object -First 1).Line
        $digest = if ($digestLine) { ($digestLine -replace '^Digest:\s+', '').Trim() } else { "" }
        if (-not $digest) {
            throw "Docker Hub image has no readable digest: $image"
        }

        [pscustomobject]@{
            Service = $service
            Tag = $tag
            Image = $image
            Digest = $digest
        }
    }
}

$results | Format-Table -AutoSize
Write-Host "Verified $(@($results).Count) Docker Hub image tags."
