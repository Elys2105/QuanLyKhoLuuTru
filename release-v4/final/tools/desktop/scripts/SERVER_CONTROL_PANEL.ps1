#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ServicesRoot = "C:\Program Files\QuanLyKhoLuuTru\Server\services\scripts"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

function Invoke-Tool {
    param([string]$Name)

    $path = Join-Path $ServicesRoot $Name
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Khong tim thay: $path"
    }

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File $path
}

while ($true) {
    Clear-Host
    Write-Host "============================================================"
    Write-Host "QUAN LY KHO LUU TRU - SERVER CONTROL PANEL"
    Write-Host "============================================================"
    Write-Host "1. Start services"
    Write-Host "2. Stop services"
    Write-Host "3. Restart services"
    Write-Host "4. Service status"
    Write-Host "5. Health check"
    Write-Host "6. Open application"
    Write-Host "0. Exit"
    Write-Host ""

    $choice = Read-Host "Chon"

    switch ($choice) {
        "1" { Invoke-Tool "START_SERVICES.ps1" }
        "2" { Invoke-Tool "STOP_SERVICES.ps1" }
        "3" { Invoke-Tool "RESTART_SERVICES.ps1" }
        "4" { Invoke-Tool "SERVICE_STATUS.ps1" }
        "5" { Invoke-Tool "SERVICE_HEALTH.ps1" }
        "6" { Start-Process "http://127.0.0.1:3000" }
        "0" { break }
        default { Write-Host "Lua chon khong hop le." -ForegroundColor Yellow }
    }

    if ($choice -ne "0") {
        Write-Host ""
        Read-Host "Nhan Enter de tiep tuc"
    }
}