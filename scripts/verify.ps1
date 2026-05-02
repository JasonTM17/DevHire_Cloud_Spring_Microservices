param(
    [string]$JavaHome = $env:JAVA_HOME,
    [string]$MavenOpts = "-Xmx768m -XX:MaxMetaspaceSize=384m -XX:ReservedCodeCacheSize=96m"
)

if ([string]::IsNullOrWhiteSpace($JavaHome)) {
    Write-Error "JAVA_HOME is not set. Install JDK 21+ and set JAVA_HOME before running verification."
    exit 1
}

$env:JAVA_HOME = $JavaHome
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
$env:MAVEN_OPTS = $MavenOpts

mvn -T1 clean verify
& "$PSScriptRoot\check-coverage.ps1" -Root (Resolve-Path "$PSScriptRoot\..").Path
exit $LASTEXITCODE
