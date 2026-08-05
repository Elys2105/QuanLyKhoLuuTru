param(
    [string]$ProjectRoot = "D:\archive-management",
    [string]$ReleaseRoot = "D:\archive-management\release-v4"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ApiRoot = Join-Path $ProjectRoot "api"
$WebRoot = Join-Path $ProjectRoot "web"
$ServerRoot = Join-Path $ReleaseRoot "payload\server"
$AppRoot = Join-Path $ServerRoot "app"
$BackendTarget = Join-Path $AppRoot "api"
$FrontendTarget = Join-Path $AppRoot "web"
$RuntimeRoot = Join-Path $ServerRoot "runtime"
$DataTemplateRoot = Join-Path $ServerRoot "data-template"
$ConfigTemplateRoot = Join-Path $ServerRoot "config-template"

function Invoke-Copy {
    param(
        [string]$Source,
        [string]$Destination,
        [string[]]$XD,
        [string[]]$XF,
        [string]$Label
    )

    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    $Args = @($Source, $Destination, "/E", "/COPY:DAT", "/DCOPY:DAT", "/R:1", "/W:1", "/XJ", "/SL", "/NP", "/TEE", "/MT:16")
    if ($XD.Count -gt 0) { $Args += "/XD"; $Args += $XD }
    if ($XF.Count -gt 0) { $Args += "/XF"; $Args += $XF }
    Write-Host "[$Label] $Source -> $Destination" -ForegroundColor Yellow
    & robocopy.exe @Args
    if ($LASTEXITCODE -gt 7) { throw "Robocopy failed: $LASTEXITCODE" }
}

if (Test-Path -LiteralPath $ServerRoot) {
    Remove-Item -LiteralPath $ServerRoot -Recurse -Force
}

@($BackendTarget, $FrontendTarget, $RuntimeRoot, $DataTemplateRoot, $ConfigTemplateRoot) |
    ForEach-Object { New-Item -ItemType Directory -Path $_ -Force | Out-Null }

$CommonXF = @("*.pyc", "*.pyo", "*.log", "*.tmp", "*.bak", "*.old", "Thumbs.db", ".DS_Store")

Invoke-Copy -Source $ApiRoot -Destination $BackendTarget `
    -XD @(".venv", "venv", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".git", "media", "staticfiles", "logs", "install-logs") `
    -XF $CommonXF -Label "BACKEND"

Invoke-Copy -Source $WebRoot -Destination $FrontendTarget `
    -XD @("node_modules", ".next", ".git", "coverage", "dist", "build", "logs", "install-logs") `
    -XF $CommonXF -Label "FRONTEND"

$Utf8 = New-Object System.Text.UTF8Encoding($false)

$RuntimeReadme = @"
SERVER RUNTIME PLACEHOLDER

PACK V4-03A does not embed Python, Node.js or PostgreSQL installers yet.
Runtime packages will be added by later installer/runtime packs.
"@
[IO.File]::WriteAllText((Join-Path $RuntimeRoot "README.txt"), $RuntimeReadme, $Utf8)

$DataReadme = @"
SERVER DATA TEMPLATE

The installer must create writable data folders under ProgramData.
Existing uploaded documents are NOT copied into the installer payload.
The live media directory must be preserved during update/uninstall unless the administrator explicitly requests deletion.
"@
[IO.File]::WriteAllText((Join-Path $DataTemplateRoot "README.txt"), $DataReadme, $Utf8)

@("media", "logs", "backup", "temp", "static") | ForEach-Object {
    $Dir = Join-Path $DataTemplateRoot $_
    New-Item -ItemType Directory -Path $Dir -Force | Out-Null
    [IO.File]::WriteAllText((Join-Path $Dir ".keep"), "", $Utf8)
}

$EnvTemplate = @"
# Generated template - values are completed by the installer.
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost
DJANGO_PORT=8000
FRONTEND_PORT=3000
DATABASE_HOST=127.0.0.1
DATABASE_PORT=5432
DATABASE_NAME=quanlykholuutru
DATABASE_USER=quanlykholuutru_app
DATABASE_PASSWORD=__SET_BY_INSTALLER__
MEDIA_ROOT=__PROGRAMDATA__\QuanLyKhoLuuTru\media
"@
[IO.File]::WriteAllText((Join-Path $ConfigTemplateRoot "server.env.template"), $EnvTemplate, $Utf8)

$PayloadInfo = [ordered]@{
    schema_version = 1
    type = "server"
    generated_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
    backend = "app\\api"
    frontend = "app\\web"
    runtime = "runtime"
    data_template = "data-template"
    includes_user_media = $false
    includes_virtual_environment = $false
    includes_node_modules = $false
    includes_next_build = $false
}
[IO.File]::WriteAllText((Join-Path $ServerRoot "payload.json"), ($PayloadInfo | ConvertTo-Json -Depth 10), $Utf8)

Write-Host "SERVER PAYLOAD: PASS" -ForegroundColor Green