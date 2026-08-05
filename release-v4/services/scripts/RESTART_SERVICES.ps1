#requires -Version 5.1
[CmdletBinding()]
param()
Set-StrictMode -Version 2.0
$ErrorActionPreference="Stop"
foreach($name in @("QuanLyKhoLuuTru-Backend","QuanLyKhoLuuTru-Frontend")){
    $svc=Get-Service -Name $name -ErrorAction SilentlyContinue
    if(-not $svc){throw "Service khong ton tai: $name"}
    Restart-Service -Name $name -Force
    Write-Host "[PASS] Restarted: $name" -ForegroundColor Green
}