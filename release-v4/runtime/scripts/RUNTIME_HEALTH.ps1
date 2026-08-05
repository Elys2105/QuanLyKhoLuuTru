#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$BackendUrl = "http://127.0.0.1:8000",
    [string]$FrontendUrl = "http://127.0.0.1:3000"
)

$failed = $false

foreach ($target in @(
    @{ Name = "Backend"; Url = $BackendUrl },
    @{ Name = "Frontend"; Url = $FrontendUrl }
)) {
    try {
        $response = Invoke-WebRequest `
            -Uri $target.Url `
            -UseBasicParsing `
            -TimeoutSec 10

        Write-Host "[PASS] $($target.Name) HTTP $($response.StatusCode)" -ForegroundColor Green
    }
    catch {
        $failed = $true
        Write-Host "[FAIL] $($target.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($failed) {
    Write-Host "RUNTIME HEALTH: FAIL" -ForegroundColor Red
    exit 1
}

Write-Host "RUNTIME HEALTH: PASS" -ForegroundColor Green
exit 0