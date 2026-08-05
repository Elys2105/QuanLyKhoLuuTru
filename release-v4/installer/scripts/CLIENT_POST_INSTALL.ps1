[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$InstallRoot
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$clientDataRoot = Join-Path $env:ProgramData "QuanLyKhoLuuTru\Client"
$configPath = Join-Path $clientDataRoot "client.json"

if (-not (Test-Path -LiteralPath $clientDataRoot)) {
    New-Item -ItemType Directory -Path $clientDataRoot -Force | Out-Null
}

if (-not (Test-Path -LiteralPath $configPath)) {
    $config = [ordered]@{
        server_url = "http://127.0.0.1:3000"
        open_mode = "browser"
        installed_at = (Get-Date).ToString("o")
        install_root = $InstallRoot
    }

    $config | ConvertTo-Json -Depth 5 |
        Set-Content -LiteralPath $configPath -Encoding UTF8
}

exit 0