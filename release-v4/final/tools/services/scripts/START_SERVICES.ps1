#requires -Version 5.1
[CmdletBinding()]
param()
Set-StrictMode -Version 2.0
$ErrorActionPreference="Stop"
foreach($name in @("QuanLyKhoLuuTru-Backend","QuanLyKhoLuuTru-Frontend")){
    $svc=Get-Service -Name $name -ErrorAction SilentlyContinue
    if(-not $svc){throw "Service khong ton tai: $name"}
    if($svc.Status -ne "Running"){Start-Service -Name $name}
    Write-Host "[PASS] $name RUNNING" -ForegroundColor Green
}