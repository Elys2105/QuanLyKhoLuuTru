#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ConfigPath = "C:\Program Files\QuanLyKhoLuuTru\Server\health\config\health.json"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "Khong tim thay health config: $ConfigPath"
}

$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$failed = $false
$warned = $false

foreach ($serviceName in $config.services) {
    $service = Get-Service -Name ([string]$serviceName) -ErrorAction SilentlyContinue

    if (-not $service) {
        $warned = $true
        Write-Host "[WARN] Service missing: $serviceName" -ForegroundColor Yellow
    }
    elseif ($service.Status -eq "Running") {
        Write-Host "[PASS] $serviceName RUNNING" -ForegroundColor Green
    }
    else {
        $failed = $true
        Write-Host "[FAIL] $serviceName $($service.Status)" -ForegroundColor Red
    }
}

foreach ($entry in @(
    @{Name="Frontend";Port=[int]$config.ports.frontend},
    @{Name="Backend";Port=[int]$config.ports.backend},
    @{Name="PostgreSQL";Port=[int]$config.ports.postgresql}
)) {
    $listener = Get-NetTCPConnection -LocalPort $entry.Port -State Listen -ErrorAction SilentlyContinue

    if ($listener) {
        Write-Host "[PASS] $($entry.Name) port $($entry.Port) LISTEN" -ForegroundColor Green
    }
    else {
        if ($entry.Name -eq "PostgreSQL") {
            $warned = $true
            Write-Host "[WARN] PostgreSQL port $($entry.Port) CLOSED" -ForegroundColor Yellow
        }
        else {
            $failed = $true
            Write-Host "[FAIL] $($entry.Name) port $($entry.Port) CLOSED" -ForegroundColor Red
        }
    }
}

foreach ($target in @(
    @{Name="Frontend";Url=[string]$config.endpoints.frontend},
    @{Name="Backend";Url=[string]$config.endpoints.backend}
)) {
    try {
        $watch = [Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $target.Url -UseBasicParsing -TimeoutSec 10
        $watch.Stop()

        Write-Host "[PASS] $($target.Name) HTTP $($response.StatusCode) $([Math]::Round($watch.Elapsed.TotalSeconds,2))s" -ForegroundColor Green
    }
    catch {
        $failed = $true
        Write-Host "[FAIL] $($target.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($failed) {
    Write-Host "HEALTH CHECK FAST: FAIL" -ForegroundColor Red
    exit 1
}

if ($warned) {
    Write-Host "HEALTH CHECK FAST: WARN" -ForegroundColor Yellow
    exit 0
}

Write-Host "HEALTH CHECK FAST: PASS" -ForegroundColor Green