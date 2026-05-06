param(
    [string[]]$Environments = @("dev", "staging", "prod"),
    [string]$TerraformImage = "hashicorp/terraform:1.10.5",
    [string]$TflintImage = "ghcr.io/terraform-linters/tflint:v0.55.1",
    [string]$TrivyImage = "aquasec/trivy:0.58.2",
    [switch]$SkipTflint,
    [switch]$SkipTrivy,
    [switch]$KeepTerraformCache,
    [int]$LockTimeoutSeconds = 900
)

$ErrorActionPreference = "Stop"

$Root = (Resolve-Path "$PSScriptRoot\..").Path
$TerraformRoot = Join-Path $Root "deploy\terraform\aws"
$LockDirectory = Join-Path $Root "reports\.locks"
$TerraformLockPath = Join-Path $LockDirectory "terraform-validate.lock"

function Acquire-TerraformValidationLock {
    New-Item -ItemType Directory -Force -Path $LockDirectory | Out-Null

    $deadline = (Get-Date).AddSeconds($LockTimeoutSeconds)
    do {
        try {
            $stream = [System.IO.File]::Open(
                $TerraformLockPath,
                [System.IO.FileMode]::OpenOrCreate,
                [System.IO.FileAccess]::ReadWrite,
                [System.IO.FileShare]::None
            )
            $stream.SetLength(0)
            $writer = [System.IO.StreamWriter]::new($stream, [System.Text.Encoding]::UTF8, 1024, $true)
            $writer.WriteLine("pid=$PID")
            $writer.WriteLine("startedAt=$((Get-Date).ToString("o"))")
            $writer.Flush()
            $writer.Dispose()
            Write-Host "Acquired Terraform validation lock: $TerraformLockPath"
            return $stream
        } catch [System.IO.IOException] {
            if ((Get-Date) -ge $deadline) {
                throw "Timed out after ${LockTimeoutSeconds}s waiting for Terraform validation lock: $TerraformLockPath"
            }
            Start-Sleep -Milliseconds 500
        }
    } while ($true)
}

function Release-TerraformValidationLock {
    param([AllowNull()][System.IO.FileStream]$LockStream)

    if ($LockStream) {
        $LockStream.Dispose()
        Write-Host "Released Terraform validation lock."
    }
}

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

    $dockerArguments = @(
        "run",
        "--rm",
        "-e",
        "TF_IN_AUTOMATION=true",
        "-e",
        "HOME=/tmp"
    )

    $isWindows = [System.Runtime.InteropServices.RuntimeInformation]::IsOSPlatform(
        [System.Runtime.InteropServices.OSPlatform]::Windows
    )
    if (-not $isWindows) {
        $uid = (& id -u).Trim()
        $gid = (& id -g).Trim()
        if ($uid -and $gid) {
            $dockerArguments += @("--user", "${uid}:${gid}")
        }
    }

    $dockerArguments += @(
        "-v",
        "${Root}:/workspace",
        "-w",
        $Workdir,
        $Image
    )
    $dockerArguments += $Arguments

    & docker @dockerArguments
}

function Clear-TerraformCache {
    $targets = @()
    $targets += Get-ChildItem -Path $TerraformRoot -Recurse -Force -Directory -Filter ".terraform" -ErrorAction SilentlyContinue
    $targets += Get-ChildItem -Path $TerraformRoot -Recurse -Force -File -Filter ".terraform.lock.hcl" -ErrorAction SilentlyContinue

    foreach ($target in $targets) {
        if (-not (Test-Path -LiteralPath $target.FullName)) {
            continue
        }

        $resolvedPath = Resolve-Path -LiteralPath $target.FullName -ErrorAction SilentlyContinue
        if (-not $resolvedPath) {
            continue
        }

        $resolved = $resolvedPath.Path
        if (-not $resolved.StartsWith($TerraformRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to remove generated Terraform cache outside ${TerraformRoot}: $resolved"
        }
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}

$terraformValidationLock = $null
try {
    $terraformValidationLock = Acquire-TerraformValidationLock

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
                "--skip-check-update",
                "--skip-dirs", ".terraform",
                "deploy/terraform/aws"
            )
        }
    }
}
finally {
    try {
        if (-not $KeepTerraformCache) {
            Clear-TerraformCache
        }
    } finally {
        Release-TerraformValidationLock -LockStream $terraformValidationLock
    }
}
