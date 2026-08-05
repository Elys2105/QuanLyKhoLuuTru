#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ConfigPath = "C:\ProgramData\QuanLyKhoLuuTru\Client\client.json"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$serverUrl = "http://127.0.0.1:3000"

if (Test-Path -LiteralPath $ConfigPath) {
    try {
        $config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
        if ($config.server_url) {
            $serverUrl = [string]$config.server_url
        }
    }
    catch {
        Write-Warning "client.json khong hop le. Dung URL mac dinh."
    }
}

Start-Process $serverUrl