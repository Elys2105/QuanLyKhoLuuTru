param(
    [string]$ConfigPath = "$env:ProgramData\QuanLyKhoLuuTru\client\client.json"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "Client configuration not found: $ConfigPath"
}

$Config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$Url = "http://{0}:{1}" -f $Config.server_host, $Config.server_port
Start-Process $Url