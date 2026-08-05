#requires -Version 5.1
[CmdletBinding()]
param()
Set-StrictMode -Version 2.0
$ErrorActionPreference="Stop"
foreach($name in @("QuanLyKhoLuuTru-Frontend","QuanLyKhoLuuTru-Backend")){
    $svc=Get-Service -Name $name -ErrorAction SilentlyContinue
    if(-not $svc){Write-Host "[PASS] $name khong ton tai";continue}
    if($svc.Status -ne "Stopped"){Stop-Service -Name $name -Force}
    Write-Host "[PASS] $name STOPPED" -ForegroundColor Green
}