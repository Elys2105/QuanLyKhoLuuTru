#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$SourceRoot = "",
    [string]$ServerRoot = "C:\Program Files\QuanLyKhoLuuTru\Server",
    [string]$ClientRoot = "C:\Program Files\QuanLyKhoLuuTru\Client"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

if (-not $SourceRoot) {
    $SourceRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
}

if (-not (Test-Path -LiteralPath $SourceRoot)) {
    throw "Khong tim thay: $SourceRoot"
}

foreach ($destinationRoot in @($ServerRoot,$ClientRoot)) {
    if (-not (Test-Path -LiteralPath $destinationRoot)) {
        New-Item -ItemType Directory -Path $destinationRoot -Force | Out-Null
    }

    $destination = Join-Path $destinationRoot "desktop"

    & robocopy $SourceRoot $destination /E /R:2 /W:2 /NFL /NDL /NJH /NJS /NP
    $code = $LASTEXITCODE

    if ($code -gt 7) {
        throw "Robocopy that bai: $destination ExitCode=$code"
    }

    Write-Host "[PASS] Desktop deployed: $destination" -ForegroundColor Green
}