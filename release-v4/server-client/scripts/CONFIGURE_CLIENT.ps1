#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ServerAddress = "",
    [string]$ConfigPath = "C:\ProgramData\QuanLyKhoLuuTru\Client\client.json"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

if (-not $ServerAddress) {
    $ServerAddress = Read-Host "Nhap IP hoac hostname cua Server"
}

$ServerAddress = $ServerAddress.Trim()

if ($ServerAddress -match '^https?://') {
    $serverUrl = $ServerAddress.TrimEnd("/")
}
else {
    $serverUrl = "http://${ServerAddress}:3000"
}

try {
    $uri = [Uri]$serverUrl
}
catch {
    throw "Dia chi Server khong hop le: $serverUrl"
}

$dir = Split-Path -Parent $ConfigPath

if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

$config = [ordered]@{
    server_url = $serverUrl
    backend_url = "http://$($uri.Host):8000"
    open_mode = "browser"
    timeout_seconds = 10
    updated_at = (Get-Date).ToString("o")
}

$config | ConvertTo-Json -Depth 5 |
    Set-Content -LiteralPath $ConfigPath -Encoding UTF8

Write-Host "[PASS] Client configured" -ForegroundColor Green
Write-Host "       $serverUrl"