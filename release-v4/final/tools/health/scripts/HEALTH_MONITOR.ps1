#requires -Version 5.1
[CmdletBinding()]
param(
    [int]$IntervalSeconds = 30,
    [string]$HealthScript = "C:\Program Files\QuanLyKhoLuuTru\Server\health\scripts\HEALTH_CHECK_FAST.ps1"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Continue"

if ($IntervalSeconds -lt 5) {
    $IntervalSeconds = 5
}

if (-not (Test-Path -LiteralPath $HealthScript)) {
    throw "Khong tim thay: $HealthScript"
}

while ($true) {
    Clear-Host
    Write-Host "QUAN LY KHO LUU TRU - HEALTH MONITOR"
    Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Host ""

    powershell.exe `
        -NoProfile `
        -ExecutionPolicy Bypass `
        -File $HealthScript

    Write-Host ""
    Write-Host "Refresh sau $IntervalSeconds giay. Ctrl+C de dung."
    Start-Sleep -Seconds $IntervalSeconds
}