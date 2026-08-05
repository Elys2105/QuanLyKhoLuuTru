#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ConfigPath = "C:\ProgramData\QuanLyKhoLuuTru\Client\client.json"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "Khong tim thay client config: $ConfigPath"
}

$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$failed = $false

foreach ($target in @(
    @{ Name = "Frontend"; Url = [string]$config.server_url },
    @{ Name = "Backend"; Url = [string]$config.backend_url }
)) {
    try {
        $uri = [Uri]$target.Url
        $tcp = Test-NetConnection `
            -ComputerName $uri.Host `
            -Port $uri.Port `
            -WarningAction SilentlyContinue

        if ($tcp.TcpTestSucceeded) {
            Write-Host "[PASS] $($target.Name) TCP $($uri.Host):$($uri.Port)" -ForegroundColor Green
        }
        else {
            $failed = $true
            Write-Host "[FAIL] $($target.Name) TCP $($uri.Host):$($uri.Port)" -ForegroundColor Red
            continue
        }

        $response = Invoke-WebRequest `
            -Uri $target.Url `
            -UseBasicParsing `
            -TimeoutSec ([int]$config.timeout_seconds)

        Write-Host "[PASS] $($target.Name) HTTP $($response.StatusCode)" -ForegroundColor Green
    }
    catch {
        $failed = $true
        Write-Host "[FAIL] $($target.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($failed) {
    Write-Host "CLIENT CONNECTION TEST: FAIL" -ForegroundColor Red
    exit 1
}

Write-Host "CLIENT CONNECTION TEST: PASS" -ForegroundColor Green
exit 0