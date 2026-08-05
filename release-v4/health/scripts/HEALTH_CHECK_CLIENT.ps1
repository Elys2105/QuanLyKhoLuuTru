#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ClientConfigPath = "C:\ProgramData\QuanLyKhoLuuTru\Client\client.json"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ClientConfigPath)) {
    throw "Khong tim thay client config: $ClientConfigPath"
}

$config = Get-Content -LiteralPath $ClientConfigPath -Raw | ConvertFrom-Json
$failed = $false

foreach ($target in @(
    @{Name="Frontend";Url=[string]$config.server_url},
    @{Name="Backend";Url=[string]$config.backend_url}
)) {
    try {
        $uri = [Uri]$target.Url
        $tcp = Test-NetConnection -ComputerName $uri.Host -Port $uri.Port -WarningAction SilentlyContinue

        if (-not $tcp.TcpTestSucceeded) {
            $failed = $true
            Write-Host "[FAIL] $($target.Name) TCP $($uri.Host):$($uri.Port)" -ForegroundColor Red
            continue
        }

        Write-Host "[PASS] $($target.Name) TCP $($uri.Host):$($uri.Port)" -ForegroundColor Green

        $response = Invoke-WebRequest -Uri $target.Url -UseBasicParsing -TimeoutSec 10
        Write-Host "[PASS] $($target.Name) HTTP $($response.StatusCode)" -ForegroundColor Green
    }
    catch {
        $failed = $true
        Write-Host "[FAIL] $($target.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($failed) {
    Write-Host "CLIENT HEALTH: FAIL" -ForegroundColor Red
    exit 1
}

Write-Host "CLIENT HEALTH: PASS" -ForegroundColor Green