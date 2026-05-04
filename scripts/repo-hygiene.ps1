[CmdletBinding()]
param(
    [string]$OutputDir = "reports/repo-hygiene"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$outputFullPath = if ([System.IO.Path]::IsPathRooted($OutputDir)) {
    [System.IO.Path]::GetFullPath($OutputDir)
} else {
    [System.IO.Path]::GetFullPath((Join-Path $repoRoot $OutputDir))
}

$forbiddenTrackedPatterns = @(
    ".env",
    ".env.local",
    ".env.gmail",
    ".env.smtp",
    ".env.claude",
    "*.tfstate",
    "*.tfstate.*",
    "*.tfplan",
    "reports/*",
    "backups/*",
    "logs/*",
    "*.log",
    "hs_err_pid*",
    "replay_pid*",
    ".idea/*",
    ".vscode/*",
    "node_modules/*",
    "target/*",
    "frontend/.next/*",
    "frontend/test-results/*",
    "frontend/playwright-report/*"
)

$requiredIgnorePatterns = @(
    ".env",
    "*.log",
    "reports/",
    "backups/",
    "hs_err_pid*",
    "replay_pid*",
    "**/.terraform/",
    "*.tfstate",
    "*.tfplan"
)

function Test-GitPattern {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Pattern
    )

    $regex = "^" + [regex]::Escape($Pattern).Replace("\*", ".*") + "$"
    return $Path -match $regex
}

function Add-Result {
    param(
        [System.Collections.Generic.List[object]]$Results,
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][bool]$Passed,
        [string]$Details = ""
    )

    $Results.Add([pscustomobject]@{
        name = $Name
        status = if ($Passed) { "passed" } else { "failed" }
        details = $Details
    })
}

Push-Location $repoRoot
try {
    $results = [System.Collections.Generic.List[object]]::new()

    $trackedFiles = @(git ls-files)
    if ($LASTEXITCODE -ne 0) {
        throw "git ls-files failed"
    }

    $forbiddenTracked = @()
    foreach ($file in $trackedFiles) {
        foreach ($pattern in $forbiddenTrackedPatterns) {
            if (Test-GitPattern -Path $file -Pattern $pattern) {
                $forbiddenTracked += [pscustomobject]@{
                    path = $file
                    pattern = $pattern
                }
            }
        }
    }
    Add-Result -Results $results -Name "forbidden tracked artifacts" -Passed (@($forbiddenTracked).Count -eq 0) -Details "$(@($forbiddenTracked).Count) tracked artifact(s)"

    $gitignore = Get-Content -Raw -Encoding UTF8 ".gitignore"
    $missingIgnorePatterns = @()
    foreach ($pattern in $requiredIgnorePatterns) {
        if ($gitignore -notmatch [regex]::Escape($pattern)) {
            $missingIgnorePatterns += $pattern
        }
    }
    Add-Result -Results $results -Name "required gitignore patterns" -Passed (@($missingIgnorePatterns).Count -eq 0) -Details "$(@($missingIgnorePatterns).Count) missing pattern(s)"

    $untrackedImportant = @()
    $statusLines = @(git status --short --untracked-files=all)
    foreach ($line in $statusLines) {
        if ($line -match "^\?\?\s+(.+)$") {
            $path = $Matches[1]
            if ($path -match "(\.env$|\.env\.|\.tfstate|\.tfplan|\.log$|^reports/|^backups/|^logs/|hs_err_pid|replay_pid)") {
                $untrackedImportant += $path
            }
        }
    }
    Add-Result -Results $results -Name "visible untracked sensitive artifacts" -Passed (@($untrackedImportant).Count -eq 0) -Details "$(@($untrackedImportant).Count) visible untracked artifact(s)"

    $gitattributes = Get-Content -Raw -Encoding UTF8 ".gitattributes"
    Add-Result -Results $results -Name "gitattributes text normalization" -Passed ($gitattributes -match "\*\s+text=auto") -Details "requires '* text=auto'"

    $overall = if (@($results | Where-Object { $_.status -ne "passed" }).Count -eq 0) { "passed" } else { "failed" }
    New-Item -ItemType Directory -Force -Path $outputFullPath | Out-Null
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $jsonPath = Join-Path $outputFullPath "repo-hygiene-$stamp.json"
    $mdPath = Join-Path $outputFullPath "repo-hygiene-$stamp.md"
    $summary = [pscustomobject]@{
        status = $overall
        generatedAt = (Get-Date).ToString("o")
        checks = @($results)
        forbiddenTracked = @($forbiddenTracked)
        missingIgnorePatterns = @($missingIgnorePatterns)
        visibleUntrackedSensitiveArtifacts = @($untrackedImportant)
    }
    $summary | ConvertTo-Json -Depth 8 | Set-Content -Path $jsonPath -Encoding UTF8

    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.Add("# DevHire Repository Hygiene Report")
    $lines.Add("")
    $lines.Add("- Status: $overall")
    $lines.Add("- Generated: $($summary.generatedAt)")
    $lines.Add("")
    $lines.Add("| Check | Status | Details |")
    $lines.Add("|---|---|---|")
    foreach ($result in $results) {
        $lines.Add("| $($result.name) | $($result.status) | $($result.details) |")
    }
    $lines | Set-Content -Path $mdPath -Encoding UTF8

    $summary | ConvertTo-Json -Depth 8
    if ($overall -ne "passed") {
        exit 1
    }
} finally {
    Pop-Location
}
