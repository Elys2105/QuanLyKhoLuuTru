#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$Destination = "C:\Program Files\QuanLyKhoLuuTru\Server\service-tools\nssm.exe"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$parent = Split-Path -Parent $Destination
if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
}

$candidates = @(
    "$env:ProgramFiles\nssm\win64\nssm.exe",
    "$env:ProgramFiles\nssm\nssm.exe",
    "$env:ChocolateyInstall\bin\nssm.exe",
    (Join-Path $PSScriptRoot "..\tools\nssm.exe")
)

$source = $null
foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) {
        $source = (Resolve-Path -LiteralPath $candidate).Path
        break
    }
}

if (-not $source) {
    $cmd = Get-Command nssm.exe -ErrorAction SilentlyContinue
    if ($cmd) { $source = $cmd.Source }
}

if (-not $source) {
    throw "Khong tim thay nssm.exe. Hay dat nssm.exe vao thu muc services\tools."
}

Copy-Item -LiteralPath $source -Destination $Destination -Force
Write-Host "[PASS] NSSM installed: $Destination" -ForegroundColor Green