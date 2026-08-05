param(
    [string]$ProjectRoot = "D:\archive-management",
    [string]$ReleaseRoot = "D:\archive-management\release-v4"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Here "BUILD_SERVER_PAYLOAD.ps1") -ProjectRoot $ProjectRoot -ReleaseRoot $ReleaseRoot
if ($LASTEXITCODE -ne 0) { throw "BUILD_SERVER_PAYLOAD failed" }

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Here "BUILD_CLIENT_PAYLOAD.ps1") -ProjectRoot $ProjectRoot -ReleaseRoot $ReleaseRoot
if ($LASTEXITCODE -ne 0) { throw "BUILD_CLIENT_PAYLOAD failed" }

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Here "BUILD_PAYLOAD_MANIFEST.ps1") -ReleaseRoot $ReleaseRoot
if ($LASTEXITCODE -ne 0) { throw "BUILD_PAYLOAD_MANIFEST failed" }

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Here "VERIFY_PAYLOAD.ps1") -ReleaseRoot $ReleaseRoot
if ($LASTEXITCODE -ne 0) { throw "VERIFY_PAYLOAD failed" }

Write-Host "BUILD ALL: PASS" -ForegroundColor Green