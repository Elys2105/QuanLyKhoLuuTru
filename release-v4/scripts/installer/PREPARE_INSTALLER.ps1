param(
    [string]$InstallRoot = "C:\Program Files\QuanLyKhoLuuTru",
    [string]$DataRoot = "C:\ProgramData\QuanLyKhoLuuTru"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ReleaseRoot = Split-Path -Parent (Split-Path -Parent $ScriptRoot)

$PrecheckScript = Join-Path $ScriptRoot "INSTALL_PRECHECK.ps1"
$RollbackStateScript = Join-Path $ScriptRoot "NEW_ROLLBACK_STATE.ps1"
$ResultPath = Join-Path $ReleaseRoot "config\installer-precheck-result.json"
$StatePath = Join-Path $ReleaseRoot "rollback\install-state.json"

& powershell.exe `
    -NoProfile `
    -ExecutionPolicy Bypass `
    -File $PrecheckScript `
    -InstallRoot $InstallRoot `
    -DataRoot $DataRoot `
    -ResultPath $ResultPath

if ($LASTEXITCODE -ne 0) {
    throw "Installer precheck failed. See: $ResultPath"
}

& powershell.exe `
    -NoProfile `
    -ExecutionPolicy Bypass `
    -File $RollbackStateScript `
    -InstallRoot $InstallRoot `
    -DataRoot $DataRoot `
    -StatePath $StatePath

if ($LASTEXITCODE -ne 0) {
    throw "Cannot create rollback state."
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "INSTALLER PREPARATION: PASS" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Install root : $InstallRoot"
Write-Host "Data root    : $DataRoot"
Write-Host "Precheck     : $ResultPath"
Write-Host "Rollback     : $StatePath"