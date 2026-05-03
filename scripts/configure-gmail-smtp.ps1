[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[^@\s]+@[^@\s]+\.[^@\s]+$')]
    [string]$Username,

    [securestring]$AppPassword,

    [string]$AppPasswordEnvName,

    [string]$EnvPath = ".env",

    [string]$ExamplePath = ".env.example",

    [string]$DashboardBaseUrl = "http://localhost:8080"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function ConvertFrom-SecureStringPlainText {
    param([Parameter(Mandatory = $true)][securestring]$Value)

    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

function Resolve-RepoPath {
    param([Parameter(Mandatory = $true)][string]$Path)

    if ([IO.Path]::IsPathRooted($Path)) {
        return $Path
    }

    $repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
    return Join-Path $repoRoot $Path
}

function Set-EnvLine {
    param(
        [Parameter(Mandatory = $true)][string]$Key,
        [AllowEmptyString()][string]$Value
    )

    $replacement = "$Key=$Value"
    for ($i = 0; $i -lt $script:EnvLines.Count; $i++) {
        if ($script:EnvLines[$i] -match "^\s*$([regex]::Escape($Key))\s*=") {
            $script:EnvLines[$i] = $replacement
            return
        }
    }

    $script:EnvLines.Add($replacement)
}

$envFile = Resolve-RepoPath $EnvPath
$exampleFile = Resolve-RepoPath $ExamplePath

if (-not (Test-Path -LiteralPath $envFile)) {
    if (-not (Test-Path -LiteralPath $exampleFile)) {
        throw "Cannot create $envFile because $exampleFile does not exist."
    }
    Copy-Item -LiteralPath $exampleFile -Destination $envFile
}

$plainPassword = $null
if ($AppPasswordEnvName) {
    $plainPassword = [Environment]::GetEnvironmentVariable($AppPasswordEnvName, "Process")
    if ([string]::IsNullOrWhiteSpace($plainPassword)) {
        $plainPassword = [Environment]::GetEnvironmentVariable($AppPasswordEnvName, "User")
    }
    if ([string]::IsNullOrWhiteSpace($plainPassword)) {
        throw "Environment variable $AppPasswordEnvName is empty or not set."
    }
} elseif ($AppPassword) {
    $plainPassword = ConvertFrom-SecureStringPlainText -Value $AppPassword
} else {
    $AppPassword = Read-Host "Google app password for $Username" -AsSecureString
    $plainPassword = ConvertFrom-SecureStringPlainText -Value $AppPassword
}

$normalizedPassword = ($plainPassword -replace '\s+', '').Trim()
if ($normalizedPassword.Length -lt 16) {
    throw "Google app password looks too short after whitespace normalization."
}

$script:EnvLines = [System.Collections.Generic.List[string]]::new()
foreach ($line in [IO.File]::ReadAllLines($envFile)) {
    $script:EnvLines.Add($line)
}

Set-EnvLine -Key "DEVHIRE_NOTIFICATION_EMAIL_ENABLED" -Value "true"
Set-EnvLine -Key "DEVHIRE_NOTIFICATION_EMAIL_FROM" -Value $Username
Set-EnvLine -Key "DEVHIRE_NOTIFICATION_EMAIL_REPLY_TO" -Value $Username
Set-EnvLine -Key "DEVHIRE_NOTIFICATION_EMAIL_DASHBOARD_BASE_URL" -Value $DashboardBaseUrl
Set-EnvLine -Key "DEVHIRE_NOTIFICATION_EMAIL_BATCH_SIZE" -Value "25"
Set-EnvLine -Key "DEVHIRE_NOTIFICATION_EMAIL_MAX_ATTEMPTS" -Value "5"
Set-EnvLine -Key "DEVHIRE_NOTIFICATION_EMAIL_RETRY_INITIAL_DELAY_SECONDS" -Value "30"
Set-EnvLine -Key "DEVHIRE_NOTIFICATION_EMAIL_RETRY_MAX_DELAY_SECONDS" -Value "900"
Set-EnvLine -Key "DEVHIRE_NOTIFICATION_EMAIL_RATE_LIMIT_PER_MINUTE" -Value "30"
Set-EnvLine -Key "SPRING_MAIL_HOST" -Value "smtp.gmail.com"
Set-EnvLine -Key "SPRING_MAIL_PORT" -Value "587"
Set-EnvLine -Key "SPRING_MAIL_USERNAME" -Value $Username
Set-EnvLine -Key "SPRING_MAIL_PASSWORD" -Value $normalizedPassword
Set-EnvLine -Key "SPRING_MAIL_SMTP_AUTH" -Value "true"
Set-EnvLine -Key "SPRING_MAIL_SMTP_STARTTLS_ENABLE" -Value "true"
Set-EnvLine -Key "SPRING_MAIL_SMTP_STARTTLS_REQUIRED" -Value "true"
Set-EnvLine -Key "SPRING_MAIL_SMTP_SSL_TRUST" -Value "smtp.gmail.com"
Set-EnvLine -Key "SPRING_MAIL_SMTP_CONNECTION_TIMEOUT" -Value "5000"
Set-EnvLine -Key "SPRING_MAIL_SMTP_TIMEOUT" -Value "5000"
Set-EnvLine -Key "SPRING_MAIL_SMTP_WRITE_TIMEOUT" -Value "5000"
Set-EnvLine -Key "MANAGEMENT_HEALTH_MAIL_ENABLED" -Value "true"

[IO.File]::WriteAllLines($envFile, $script:EnvLines, [Text.UTF8Encoding]::new($false))

Write-Host "Gmail SMTP configuration written to $envFile for $Username."
Write-Host "The app password was normalized and stored only in the local gitignored .env file."
