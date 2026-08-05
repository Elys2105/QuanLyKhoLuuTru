#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$InstallServer,
    [switch]$InstallClient
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot

if (-not $InstallServer -and -not $InstallClient) {
    Write-Host "Dung -InstallServer, -InstallClient hoac ca hai."
    exit 0
}

if ($InstallServer) {
    $serverSetup = Join-Path $root "server\QuanLyKhoLuuTru_Server_V4_03B_Setup.exe"

    if (-not (Test-Path -LiteralPath $serverSetup)) {
        throw "Khong tim thay Server setup."
    }

    Start-Process -FilePath $serverSetup -Verb RunAs -Wait
}

if ($InstallClient) {
    $clientSetup = Join-Path $root "client\QuanLyKhoLuuTru_Client_V4_03B_Setup.exe"

    if (-not (Test-Path -LiteralPath $clientSetup)) {
        throw "Khong tim thay Client setup."
    }

    Start-Process -FilePath $clientSetup -Verb RunAs -Wait
}