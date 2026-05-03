param(
    [string[]]$Environments = @("dev", "staging", "prod"),
    [string]$TerraformImage = "hashicorp/terraform:1.10.5",
    [string]$TflintImage = "ghcr.io/terraform-linters/tflint:v0.55.1",
    [string]$TrivyImage = "aquasec/trivy:0.58.2",
    [switch]$SkipTflint,
    [switch]$SkipTrivy,
    [switch]$KeepTerraformCache
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path "$PSScriptRoot\..").Path
$TerraformRoot = Join-Path $Root "deploy\terraform\aws"

function Invoke-Checked {
    param(
        [string]$Name,
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==> $Name"
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE"
    }
}

function Invoke-Docker {
    param(
        [string]$Image,
        [string]$Workdir,
        [string[]]$Arguments
    )

    & docker run --rm `
        -e TF_IN_AUTOMATION=true `
        -v "${Root}:/workspace" `
        -w $Workdir `
        $Image `
        @Arguments
}

function Clear-TerraformCache {
    $targets = @()
    $targets += Get-ChildItem -Path $TerraformRoot -Recurse -Force -Directory -Filter ".terraform" -ErrorAction SilentlyContinue
    $targets += Get-ChildItem -Path $TerraformRoot -Recurse -Force -File -Filter ".terraform.lock.hcl" -ErrorAction SilentlyContinue

    foreach ($target in $targets) {
        $resolved = (Resolve-Path -LiteralPath $target.FullName).Path
        if (-not $resolved.StartsWith($TerraformRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to remove generated Terraform cache outside ${TerraformRoot}: $resolved"
        }
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}

try {
    Invoke-Checked "Terraform fmt" {
        Invoke-Docker -Image $TerraformImage -Workdir "/workspace" -Arguments @("fmt", "-check", "-recursive", "deploy/terraform/aws")
    }

    foreach ($environment in $Environments) {
        $environmentPath = Join-Path $TerraformRoot "environments\$environment"
        if (-not (Test-Path $environmentPath)) {
            throw "Terraform environment does not exist: $environment"
        }

        $containerWorkdir = "/workspace/deploy/terraform/aws/environments/$environment"

        Invoke-Checked "Terraform init ($environment)" {
            Invoke-Docker -Image $TerraformImage -Workdir $containerWorkdir -Arguments @("init", "-backend=false")
        }

        Invoke-Checked "Terraform validate ($environment)" {
            Invoke-Docker -Image $TerraformImage -Workdir $containerWorkdir -Arguments @("validate")
        }
    }

    if (-not $SkipTflint) {
        Invoke-Checked "TFLint recursive scan" {
            Invoke-Docker -Image $TflintImage -Workdir "/workspace/deploy/terraform/aws" -Arguments @("--recursive", "--minimum-failure-severity=error")
        }
    }

    if (-not $SkipTrivy) {
        Invoke-Checked "Trivy Terraform config scan" {
            Invoke-Docker -Image $TrivyImage -Workdir "/workspace" -Arguments @(
                "config",
                "--severity", "CRITICAL",
                "--exit-code", "1",
                "--skip-dirs", ".terraform",
                "deploy/terraform/aws"
            )
        }
    }
}
finally {
    if (-not $KeepTerraformCache) {
        Clear-TerraformCache
    }
}
