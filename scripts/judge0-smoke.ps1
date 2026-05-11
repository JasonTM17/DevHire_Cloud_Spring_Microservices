param(
    [string]$RunnerUrl = $env:ASSESSMENT_RUNNER_URL,
    [string]$InternalToken = $env:INTERNAL_GATEWAY_TOKEN
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RunnerUrl)) {
    $RunnerUrl = "http://localhost:8089"
}

$headers = @{ "Content-Type" = "application/json" }
if (-not [string]::IsNullOrWhiteSpace($InternalToken)) {
    $headers["X-Internal-Gateway-Token"] = $InternalToken
}

function Invoke-RunnerCase {
    param(
        [string]$Name,
        [string]$Code,
        [string]$Input,
        [string]$ExpectedVerdict,
        [string]$ExpectedOutput = "PASSED",
        [int]$TimeLimitMs = 2000
    )

    $caseId = [guid]::NewGuid().ToString()
    $body = @{
        language = "Java"
        code = $Code
        testCases = @(
            @{
                id = $caseId
                name = $Name
                visibility = "VISIBLE"
                input = $Input
                stdin = $Input
                expectedOutput = $ExpectedOutput
                weight = 10
                timeLimitMs = $TimeLimitMs
                memoryLimitKb = 131072
            }
        )
        timeLimitMs = $TimeLimitMs
        memoryLimitKb = 131072
        maxOutputBytes = 12000
    } | ConvertTo-Json -Depth 8

    $response = Invoke-RestMethod -Method Post -Uri "$RunnerUrl/internal/assessment-runs" -Headers $headers -Body $body
    $data = $response.data
    if ($data.verdict -ne $ExpectedVerdict) {
        throw "$Name expected verdict $ExpectedVerdict but got $($data.verdict): $($data.failureReason)"
    }
    Write-Host "[judge0-smoke] $Name => $($data.verdict)"
}

function Invoke-RunnerHealth {
    $response = Invoke-RestMethod -Method Get -Uri "$RunnerUrl/internal/assessment-runs/health" -Headers $headers
    $data = $response.data
    if ($null -eq $data) {
        throw "Runner health endpoint returned no data"
    }
    if ($data.status -eq "DOWN" -or $data.failClosed -eq $true) {
        throw "Runner is not ready for Judge0 smoke: status=$($data.status) failClosed=$($data.failClosed) reason=$($data.failClosedReason)"
    }
    Write-Host "[judge0-smoke] health => $($data.status) / $($data.mode) / $($data.runnerVersion)"
}

$acceptedCode = @'
class CandidateSolution {
  String solve(String input) {
    return input.contains("policy=STRICT") && input.contains("tag=production") ? "PASSED" : "REJECTED";
  }
}
'@

$wrongCode = @'
class CandidateSolution {
  String solve(String input) {
    return "REJECTED";
  }
}
'@

$compileErrorCode = @'
class CandidateSolution {
  String solve(String input) {
    return "PASSED"
  }
}
'@

$policyBlockedCode = @'
class CandidateSolution {
  String solve(String input) {
    System.exit(0);
    return "PASSED";
  }
}
'@

$timeoutCode = @'
class CandidateSolution {
  String solve(String input) {
    while (true) {
    }
  }
}
'@

Invoke-RunnerHealth
Invoke-RunnerCase -Name "accepted-java-solve" -Code $acceptedCode -Input "resource=res-1;policy=STRICT;tag=production" -ExpectedVerdict "ACCEPTED"
Invoke-RunnerCase -Name "wrong-answer-java-solve" -Code $wrongCode -Input "resource=res-1;policy=STRICT;tag=production" -ExpectedVerdict "WRONG_ANSWER"
Invoke-RunnerCase -Name "compile-error-java-solve" -Code $compileErrorCode -Input "resource=res-1;policy=STRICT;tag=production" -ExpectedVerdict "COMPILE_ERROR"
Invoke-RunnerCase -Name "policy-blocked-java-solve" -Code $policyBlockedCode -Input "resource=res-1;policy=STRICT;tag=production" -ExpectedVerdict "POLICY_BLOCKED"
Invoke-RunnerCase -Name "timeout-java-solve" -Code $timeoutCode -Input "resource=res-1;policy=STRICT;tag=production" -ExpectedVerdict "TIME_LIMIT_EXCEEDED" -TimeLimitMs 750

Write-Host "[judge0-smoke] completed against $RunnerUrl"
