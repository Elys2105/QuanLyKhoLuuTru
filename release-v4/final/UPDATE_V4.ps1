#requires -Version 5.1
[CmdletBinding(SupportsShouldProcess=$true,ConfirmImpact="High")]
param(
    [Parameter(Mandatory=$true)]
    [string]$UpdateSource,

    [string]$InstallRoot = "C:\Program Files\QuanLyKhoLuuTru\Server",
    [string]$DataRoot = "C:\ProgramData\QuanLyKhoLuuTru\Server",
    [switch]$SkipBackup,
    [switch]$SkipServices
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

if (-not (Test-Path -LiteralPath $UpdateSource)) {
    throw "Khong tim thay update source: $UpdateSource"
}

$manifestPath = Join-Path $UpdateSource "meta\FINAL_RELEASE_MANIFEST.json"
if (-not (Test-Path -LiteralPath $manifestPath)) {
    throw "Update source thieu FINAL_RELEASE_MANIFEST.json"
}

if (-not $SkipBackup) {
    $backupScript = Join-Path $InstallRoot "backup\scripts\BACKUP_FULL.ps1"

    if (Test-Path -LiteralPath $backupScript) {
        if ($PSCmdlet.ShouldProcess("Current installation","Create backup before update")) {
            powershell.exe -NoProfile -ExecutionPolicy Bypass -File $backupScript
            if ($LASTEXITCODE -ne 0) {
                throw "Backup truoc update that bai."
            }
        }
    }
}

if (-not $SkipServices) {
    foreach ($name in @("QuanLyKhoLuuTru-Frontend","QuanLyKhoLuuTru-Backend")) {
        $service = Get-Service -Name $name -ErrorAction SilentlyContinue
        if ($service -and $service.Status -ne "Stopped") {
            Stop-Service -Name $name -Force
        }
    }
}

$toolsSource = Join-Path $UpdateSource "tools"
$toolsDestination = Join-Path $InstallRoot "release-tools"

if ($PSCmdlet.ShouldProcess($InstallRoot,"Apply V4 release tools update")) {
    if (-not (Test-Path -LiteralPath $toolsDestination)) {
        New-Item -ItemType Directory -Path $toolsDestination -Force | Out-Null
    }

    & robocopy $toolsSource $toolsDestination /E /COPY:DAT /DCOPY:T /R:2 /W:2 /XJ /NFL /NDL /NJH /NJS /NP
    $code = $LASTEXITCODE

    if ($code -gt 7) {
        throw "Update copy that bai. ExitCode=$code"
    }
}

if (-not $SkipServices) {
    foreach ($name in @("QuanLyKhoLuuTru-Backend","QuanLyKhoLuuTru-Frontend")) {
        $service = Get-Service -Name $name -ErrorAction SilentlyContinue
        if ($service) {
            Start-Service -Name $name
        }
    }
}

$stateRoot = Join-Path $DataRoot "config"
if (-not (Test-Path -LiteralPath $stateRoot)) {
    New-Item -ItemType Directory -Path $stateRoot -Force | Out-Null
}

[ordered]@{
    updated_at = (Get-Date).ToString("o")
    update_source = $UpdateSource
    install_root = $InstallRoot
} | ConvertTo-Json -Depth 5 |
    Set-Content -LiteralPath (Join-Path $stateRoot "last-update.json") -Encoding UTF8

Write-Host "UPDATE V4: PASS" -ForegroundColor Green