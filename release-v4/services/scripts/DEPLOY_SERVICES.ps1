#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$SourceRoot = "",
    [string]$InstallRoot = "C:\Program Files\QuanLyKhoLuuTru\Server"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference="Stop"

if(-not $SourceRoot){
    $SourceRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
}
if(-not(Test-Path -LiteralPath $SourceRoot)){throw "Khong tim thay $SourceRoot"}

$destination=Join-Path $InstallRoot "services"
if(-not(Test-Path -LiteralPath $destination)){
    New-Item -ItemType Directory -Path $destination -Force|Out-Null
}

& robocopy $SourceRoot $destination /E /R:2 /W:2 /NFL /NDL /NJH /NJS /NP
$code=$LASTEXITCODE
if($code -gt 7){throw "Robocopy that bai. ExitCode=$code"}

Write-Host "[PASS] Services deployed: $destination" -ForegroundColor Green