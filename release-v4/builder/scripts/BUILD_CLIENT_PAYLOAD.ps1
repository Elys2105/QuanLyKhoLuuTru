param(
    [string]$ProjectRoot = "D:\archive-management",
    [string]$ReleaseRoot = "D:\archive-management\release-v4"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ClientRoot = Join-Path $ReleaseRoot "payload\client"
$LauncherRoot = Join-Path $ClientRoot "launcher"
$ConfigTemplateRoot = Join-Path $ClientRoot "config-template"
$DocsRoot = Join-Path $ClientRoot "docs"
$Utf8 = New-Object System.Text.UTF8Encoding($false)

if (Test-Path -LiteralPath $ClientRoot) {
    Remove-Item -LiteralPath $ClientRoot -Recurse -Force
}

@($LauncherRoot, $ConfigTemplateRoot, $DocsRoot) |
    ForEach-Object { New-Item -ItemType Directory -Path $_ -Force | Out-Null }

$LauncherScript = @"
param(
    [string]`$ConfigPath = "`$env:ProgramData\QuanLyKhoLuuTru\client\client.json"
)

`$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath `$ConfigPath)) {
    throw "Client configuration not found: `$ConfigPath"
}

`$Config = Get-Content -LiteralPath `$ConfigPath -Raw | ConvertFrom-Json
`$Url = "http://{0}:{1}" -f `$Config.server_host, `$Config.server_port
Start-Process `$Url
"@
[IO.File]::WriteAllText((Join-Path $LauncherRoot "OPEN_QUAN_LY_KHO.ps1"), $LauncherScript, $Utf8)

$ClientConfig = [ordered]@{
    schema_version = 1
    server_host = "__SERVER_HOST__"
    server_port = 3000
    backend_port = 8000
    protocol = "http"
    launch_path = "/"
}
[IO.File]::WriteAllText((Join-Path $ConfigTemplateRoot "client.json.template"), ($ClientConfig | ConvertTo-Json -Depth 10), $Utf8)

$Readme = @"
CLIENT PAYLOAD

The client package contains only a launcher and connection configuration.
Documents remain on the server. Client machines do not receive synchronized copies of uploaded files.
The installer will create Desktop and Start Menu shortcuts in later packs.
"@
[IO.File]::WriteAllText((Join-Path $DocsRoot "README.txt"), $Readme, $Utf8)

$PayloadInfo = [ordered]@{
    schema_version = 1
    type = "client"
    generated_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
    launcher = "launcher\\OPEN_QUAN_LY_KHO.ps1"
    configuration_template = "config-template\\client.json.template"
    synchronizes_files = $false
}
[IO.File]::WriteAllText((Join-Path $ClientRoot "payload.json"), ($PayloadInfo | ConvertTo-Json -Depth 10), $Utf8)

Write-Host "CLIENT PAYLOAD: PASS" -ForegroundColor Green