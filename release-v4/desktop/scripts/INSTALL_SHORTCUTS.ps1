#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ServerRoot = "C:\Program Files\QuanLyKhoLuuTru\Server",
    [string]$ClientRoot = "C:\Program Files\QuanLyKhoLuuTru\Client",
    [string]$ProgramDataRoot = "C:\ProgramData\QuanLyKhoLuuTru"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$desktop = [Environment]::GetFolderPath("CommonDesktopDirectory")
$startMenu = Join-Path ([Environment]::GetFolderPath("CommonPrograms")) "Quan Ly Kho Luu Tru"

if (-not (Test-Path -LiteralPath $startMenu)) {
    New-Item -ItemType Directory -Path $startMenu -Force | Out-Null
}

$wsh = New-Object -ComObject WScript.Shell
$powerShellExe = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"

function New-Shortcut {
    param(
        [string]$Path,
        [string]$Target,
        [string]$Arguments,
        [string]$WorkingDirectory,
        [string]$Description
    )

    $shortcut = $wsh.CreateShortcut($Path)
    $shortcut.TargetPath = $Target
    $shortcut.Arguments = $Arguments
    $shortcut.WorkingDirectory = $WorkingDirectory
    $shortcut.Description = $Description
    $shortcut.WindowStyle = 1
    $shortcut.Save()

    Write-Host "[PASS] $Path" -ForegroundColor Green
}

$clientLauncher = Join-Path $ClientRoot "desktop\scripts\OPEN_QUAN_LY_KHO.ps1"
$serverPanel = Join-Path $ServerRoot "desktop\scripts\SERVER_CONTROL_PANEL.ps1"

if (Test-Path -LiteralPath $clientLauncher) {
    New-Shortcut `
        -Path (Join-Path $desktop "Quan Ly Kho Luu Tru.lnk") `
        -Target $powerShellExe `
        -Arguments "-NoProfile -ExecutionPolicy Bypass -File `"$clientLauncher`"" `
        -WorkingDirectory $ClientRoot `
        -Description "Mo Quan Ly Kho Luu Tru"

    New-Shortcut `
        -Path (Join-Path $startMenu "Quan Ly Kho Luu Tru.lnk") `
        -Target $powerShellExe `
        -Arguments "-NoProfile -ExecutionPolicy Bypass -File `"$clientLauncher`"" `
        -WorkingDirectory $ClientRoot `
        -Description "Mo Quan Ly Kho Luu Tru"
}

if (Test-Path -LiteralPath $serverPanel) {
    New-Shortcut `
        -Path (Join-Path $desktop "Quan Ly Kho Luu Tru - Server.lnk") `
        -Target $powerShellExe `
        -Arguments "-NoProfile -ExecutionPolicy Bypass -File `"$serverPanel`"" `
        -WorkingDirectory $ServerRoot `
        -Description "Server Control Panel"

    New-Shortcut `
        -Path (Join-Path $startMenu "Server Control Panel.lnk") `
        -Target $powerShellExe `
        -Arguments "-NoProfile -ExecutionPolicy Bypass -File `"$serverPanel`"" `
        -WorkingDirectory $ServerRoot `
        -Description "Server Control Panel"
}

$clientUninstall = Join-Path $ClientRoot "unins000.exe"
if (Test-Path -LiteralPath $clientUninstall) {
    New-Shortcut `
        -Path (Join-Path $startMenu "Go bo Client.lnk") `
        -Target $clientUninstall `
        -Arguments "" `
        -WorkingDirectory $ClientRoot `
        -Description "Go bo Client"
}

$serverUninstall = Join-Path $ServerRoot "unins000.exe"
if (Test-Path -LiteralPath $serverUninstall) {
    New-Shortcut `
        -Path (Join-Path $startMenu "Go bo Server.lnk") `
        -Target $serverUninstall `
        -Arguments "" `
        -WorkingDirectory $ServerRoot `
        -Description "Go bo Server"
}

$configDir = Join-Path $ProgramDataRoot "Client"
$configFile = Join-Path $configDir "client.json"

if (-not (Test-Path -LiteralPath $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

if (-not (Test-Path -LiteralPath $configFile)) {
    [ordered]@{
        server_url = "http://127.0.0.1:3000"
        open_mode = "browser"
        created_at = (Get-Date).ToString("o")
    } | ConvertTo-Json -Depth 5 |
        Set-Content -LiteralPath $configFile -Encoding UTF8

    Write-Host "[PASS] $configFile" -ForegroundColor Green
}