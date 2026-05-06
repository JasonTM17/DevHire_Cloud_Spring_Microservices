[CmdletBinding()]
param(
    [switch]$SkipTerraform,
    [switch]$SkipHelm,
    [switch]$SkipKustomize,
    [switch]$SkipKubeconform,
    [string]$ReportDir = "reports/cloud-verify",
    [string]$HelmImage = "alpine/helm:3.16.4",
    [string]$KubectlImage = "bitnami/kubectl:1.31.4",
    [string]$KubeconformImage = "ghcr.io/yannh/kubeconform:v0.6.7"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$cloudPolicyAuditScript = Join-Path $PSScriptRoot "cloud-policy-audit.ps1"
$terraformValidateScript = Join-Path $PSScriptRoot "terraform-validate.ps1"
$reportRoot = if ([System.IO.Path]::IsPathRooted($ReportDir)) {
    [System.IO.Path]::GetFullPath($ReportDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $ReportDir))
}

$steps = [System.Collections.Generic.List[object]]::new()
$renderedFiles = [System.Collections.Generic.List[string]]::new()

function Invoke-CloudStep {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][scriptblock]$Action
    )

    Write-Host ""
    Write-Host "==> $Name"
    $started = Get-Date
    try {
        Set-Variable -Name LASTEXITCODE -Scope Global -Value 0 -ErrorAction SilentlyContinue
        & $Action
        $exitCodeVariable = Get-Variable -Name LASTEXITCODE -Scope Global -ErrorAction SilentlyContinue
        $exitCode = if ($exitCodeVariable) { $exitCodeVariable.Value } else { 0 }
        if ($exitCode -ne 0) {
            throw "$Command failed with exit code $LASTEXITCODE"
        }
        $steps.Add([pscustomobject]@{
            name = $Name
            command = $Command
            status = "passed"
            durationSeconds = [Math]::Round(((Get-Date) - $started).TotalSeconds, 2)
        })
        Write-Host "PASS $Name"
    } catch {
        $steps.Add([pscustomobject]@{
            name = $Name
            command = $Command
            status = "failed"
            durationSeconds = [Math]::Round(((Get-Date) - $started).TotalSeconds, 2)
            error = $_.Exception.Message
        })
        throw
    }
}

function Invoke-ContainerTool {
    param(
        [Parameter(Mandatory = $true)][string]$Image,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    docker run --rm `
        -v "${repoRoot}:/workspace" `
        -w /workspace `
        $Image `
        @Arguments
}

function Invoke-Helm {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    $helm = Get-Command helm -ErrorAction SilentlyContinue
    if ($helm) {
        & helm @Arguments
    } else {
        Invoke-ContainerTool -Image $HelmImage -Arguments $Arguments
    }
}

function Invoke-Kubectl {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)

    $kubectl = Get-Command kubectl -ErrorAction SilentlyContinue
    if ($kubectl) {
        & kubectl @Arguments
    } else {
        Invoke-ContainerTool -Image $KubectlImage -Arguments $Arguments
    }
}

function Assert-TextAbsent {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Pattern,
        [Parameter(Mandatory = $true)][string]$Reason
    )

    $matches = @(Select-String -Path $Path -Pattern $Pattern -CaseSensitive:$false -ErrorAction SilentlyContinue)
    if ($matches.Count -gt 0) {
        $sample = ($matches | Select-Object -First 5 | ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" }) -join "`n"
        throw "$Reason`n$sample"
    }
}

function Assert-TextPresent {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Pattern,
        [Parameter(Mandatory = $true)][string]$Reason
    )

    $matches = @(Select-String -Path $Path -Pattern $Pattern -CaseSensitive:$false -ErrorAction SilentlyContinue)
    if ($matches.Count -eq 0) {
        throw $Reason
    }
}

New-Item -ItemType Directory -Force -Path $reportRoot | Out-Null
$renderRoot = Join-Path $reportRoot "rendered"
New-Item -ItemType Directory -Force -Path $renderRoot | Out-Null

Push-Location $repoRoot
try {
    Invoke-CloudStep "cloud policy assertions" "cloud policy assertions" {
        & $cloudPolicyAuditScript
    }

    if (-not $SkipTerraform) {
        Invoke-CloudStep "terraform safe validate" ".\scripts\terraform-validate.ps1" {
            & $terraformValidateScript
        }
    }

    if (-not $SkipHelm) {
        Invoke-CloudStep "helm lint" "helm lint deploy/helm/devhire-cloud" {
            Invoke-Helm -Arguments @("lint", "deploy/helm/devhire-cloud")
        }

        foreach ($valuesFile in @("values-local.yaml", "values-staging.yaml", "values-prod.yaml", "values-aws-staging.yaml", "values-aws-prod.yaml")) {
            $outputPath = Join-Path $renderRoot ("helm-$($valuesFile -replace '\.yaml$', '').yaml")
            Invoke-CloudStep "helm template $valuesFile" "helm template devhire-cloud deploy/helm/devhire-cloud -f deploy/helm/devhire-cloud/$valuesFile" {
                $rendered = Invoke-Helm -Arguments @("template", "devhire-cloud", "deploy/helm/devhire-cloud", "-f", "deploy/helm/devhire-cloud/$valuesFile")
                $rendered | Set-Content -Path $outputPath -Encoding UTF8
            }
            $renderedFiles.Add($outputPath)
        }
    }

    if (-not $SkipKustomize) {
        $outputPath = Join-Path $renderRoot "kustomize-raw.yaml"
        Invoke-CloudStep "kustomize raw manifests" "kubectl kustomize deploy/k8s" {
            $rendered = Invoke-Kubectl -Arguments @("kustomize", "deploy/k8s")
            $rendered | Set-Content -Path $outputPath -Encoding UTF8
        }
        $renderedFiles.Add($outputPath)
    }

    if (-not $SkipKubeconform -and $renderedFiles.Count -gt 0) {
        foreach ($renderedFile in $renderedFiles) {
            $relative = (Resolve-Path -LiteralPath $renderedFile).Path.Substring($repoRoot.Length + 1).Replace("\", "/")
            Invoke-CloudStep "kubeconform $relative" "kubeconform $relative" {
                Invoke-ContainerTool -Image $KubeconformImage -Arguments @(
                    "-strict",
                    "-summary",
                    "-skip",
                    "ExternalSecret,ClusterSecretStore",
                    $relative
                )
            }
        }
    }
} finally {
    Pop-Location
}

$status = if ($steps.Where({ $_.status -eq "failed" }).Count -gt 0) { "failed" } else { "passed" }
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$jsonPath = Join-Path $reportRoot "cloud-verify-$stamp.json"
$mdPath = Join-Path $reportRoot "cloud-verify-$stamp.md"

$report = [pscustomobject]@{
    status = $status
    generatedAt = (Get-Date).ToString("o")
    noTerraformApply = $true
    awsCredentialsRequired = $false
    helmMode = if (Get-Command helm -ErrorAction SilentlyContinue) { "local" } else { "docker:$HelmImage" }
    kubectlMode = if (Get-Command kubectl -ErrorAction SilentlyContinue) { "local" } else { "docker:$KubectlImage" }
    steps = @($steps)
}
$report | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add("# Cloud Verification Report")
$lines.Add("")
$lines.Add("- Status: $status")
$lines.Add("- Terraform apply: not run")
$lines.Add("- AWS credentials required: false")
$lines.Add("- Helm mode: $($report.helmMode)")
$lines.Add("- Kubectl mode: $($report.kubectlMode)")
$lines.Add("")
$lines.Add("| Step | Status | Duration | Command |")
$lines.Add("|---|---|---:|---|")
foreach ($step in $steps) {
    $lines.Add("| $($step.name) | $($step.status) | $($step.durationSeconds)s | ``$($step.command.Replace('|', '\|'))`` |")
}
$lines | Set-Content -Path $mdPath -Encoding UTF8

Write-Host ""
Write-Host "Cloud verification summary:"
Write-Host "  status              : $status"
Write-Host "  terraform apply      : not run"
Write-Host "  aws credentials req. : false"
Write-Host "  helm mode            : $($report.helmMode)"
Write-Host "  kubectl mode         : $($report.kubectlMode)"
Write-Host ""
Write-Host "Reports:"
Write-Host "  $jsonPath"
Write-Host "  $mdPath"

if ($status -ne "passed") {
    exit 1
}
