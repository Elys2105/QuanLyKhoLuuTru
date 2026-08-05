#requires -Version 5.1
[CmdletBinding()]
param()

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$desktop = [Environment]::GetFolderPath("CommonDesktopDirectory")
$startMenu = Join-Path ([Environment]::GetFolderPath("CommonPrograms")) "Quan Ly Kho Luu Tru"

foreach ($path in @(
    (Join-Path $desktop "Quan Ly Kho Luu Tru.lnk"),
    (Join-Path $desktop "Quan Ly Kho Luu Tru - Server.lnk")
)) {
    if (Test-Path -LiteralPath $path) {
        Remove-Item -LiteralPath $path -Force
        Write-Host "[PASS] Removed: $path" -ForegroundColor Green
    }
}

if (Test-Path -LiteralPath $startMenu) {
    Remove-Item -LiteralPath $startMenu -Recurse -Force
    Write-Host "[PASS] Removed: $startMenu" -ForegroundColor Green
}