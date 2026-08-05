#requires -Version 5.1
[CmdletBinding()]
param(
 [string]$SourceTemplate="",
 [string]$DestinationRoot="C:\ProgramData\QuanLyKhoLuuTru\Server\config"
)
Set-StrictMode -Version 2.0
$ErrorActionPreference="Stop"
if(-not $SourceTemplate){$SourceTemplate=Join-Path $PSScriptRoot "..\config\database.json.template"}
$SourceTemplate=[IO.Path]::GetFullPath($SourceTemplate)
if(-not(Test-Path -LiteralPath $SourceTemplate)){throw "Khong tim thay $SourceTemplate"}
if(-not(Test-Path -LiteralPath $DestinationRoot)){New-Item -ItemType Directory -Path $DestinationRoot -Force|Out-Null}
$dest=Join-Path $DestinationRoot "database.json"
if(Test-Path -LiteralPath $dest){Write-Host "[PASS] database.json da ton tai; khong ghi de" -ForegroundColor Green;exit 0}
Copy-Item -LiteralPath $SourceTemplate -Destination $dest -Force
Write-Host "[PASS] $dest" -ForegroundColor Green
Write-Host "[WARN] Thay CHANGE_ME bang mat khau thuc te" -ForegroundColor Yellow