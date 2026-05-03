[CmdletBinding()]
param(
    [string]$EnvPath = ".env",

    [string]$To,

    [string]$Subject = "DevHire Cloud Gmail SMTP smoke test"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-RepoPath {
    param([Parameter(Mandatory = $true)][string]$Path)

    if ([IO.Path]::IsPathRooted($Path)) {
        return $Path
    }

    $repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
    return Join-Path $repoRoot $Path
}

function Read-EnvFile {
    param([Parameter(Mandatory = $true)][string]$Path)

    $values = @{}
    foreach ($line in [IO.File]::ReadAllLines($Path)) {
        $trimmed = $line.Trim()
        if ($trimmed.Length -eq 0 -or $trimmed.StartsWith("#")) {
            continue
        }
        $parts = $trimmed.Split("=", 2)
        if ($parts.Count -ne 2) {
            continue
        }
        $values[$parts[0].Trim()] = $parts[1].Trim()
    }
    return $values
}

function Require-EnvValue {
    param(
        [Parameter(Mandatory = $true)][hashtable]$Values,
        [Parameter(Mandatory = $true)][string]$Key
    )

    if (-not $Values.ContainsKey($Key) -or [string]::IsNullOrWhiteSpace($Values[$Key])) {
        throw "$Key is missing in the env file."
    }
    return $Values[$Key]
}

$envFile = Resolve-RepoPath $EnvPath
if (-not (Test-Path -LiteralPath $envFile)) {
    throw "$envFile does not exist. Run scripts/configure-gmail-smtp.ps1 first."
}

$values = Read-EnvFile -Path $envFile
$hostName = Require-EnvValue -Values $values -Key "SPRING_MAIL_HOST"
$port = [int](Require-EnvValue -Values $values -Key "SPRING_MAIL_PORT")
$username = Require-EnvValue -Values $values -Key "SPRING_MAIL_USERNAME"
$password = (Require-EnvValue -Values $values -Key "SPRING_MAIL_PASSWORD") -replace '\s+', ''
$from = Require-EnvValue -Values $values -Key "DEVHIRE_NOTIFICATION_EMAIL_FROM"
if ([string]::IsNullOrWhiteSpace($To)) {
    $To = $username
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$client = [Net.Mail.SmtpClient]::new($hostName, $port)
$message = [Net.Mail.MailMessage]::new()
try {
    $client.EnableSsl = $true
    $client.Credentials = [Net.NetworkCredential]::new($username, $password)

    $message.From = [Net.Mail.MailAddress]::new($from)
    $message.To.Add($To)
    $message.Subject = $Subject
    $message.Body = @"
DevHire Cloud SMTP smoke test succeeded.

Sender: $from
SMTP host: ${hostName}:$port
Timestamp UTC: $([DateTimeOffset]::UtcNow.ToString("O"))
"@

    $client.Send($message)
    Write-Host "SMTP smoke email sent to $To through ${hostName}:$port."
} finally {
    $message.Dispose()
    $client.Dispose()
}
