#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ConfigPath = "C:\ProgramData\QuanLyKhoLuuTru\Client\client.json",
    [string]$ServerUrl = ""
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

if (-not $ServerUrl) {
    $ServerUrl = Read-Host "Nhap dia chi Server, vi du http://192.168.1.10:3000"
}

if ($ServerUrl -notmatch '^https?://') {
    throw "ServerUrl phai bat dau bang http:// hoac https://"
}

$dir = Split-Path -Parent $ConfigPath
if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

$config = [ordered]@{
    server_url = $ServerUrl.TrimEnd("/")
    open_mode = "browser"
    updated_at = (Get-Date).ToString("o")
}

$config | ConvertTo-Json -Depth 5 |
    Set-Content -LiteralPath $ConfigPath -Encoding UTF8

Write-Host "[PASS] Client configured: $($config.server_url)" -ForegroundColor Green