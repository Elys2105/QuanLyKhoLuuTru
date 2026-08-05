#requires -Version 5.1
[CmdletBinding()]
param()
Set-StrictMode -Version 2.0
$ErrorActionPreference="Stop"

foreach($name in @("QuanLyKhoLuuTru-Backend","QuanLyKhoLuuTru-Frontend")){
    $svc=Get-CimInstance Win32_Service -Filter "Name='$name'" -ErrorAction SilentlyContinue
    if(-not $svc){
        Write-Host "[MISSING] $name" -ForegroundColor Red
        continue
    }

    $color=if($svc.State -eq "Running"){"Green"}else{"Yellow"}
    Write-Host "[$($svc.State.ToUpper())] $name StartMode=$($svc.StartMode) PID=$($svc.ProcessId)" -ForegroundColor $color
}

foreach($port in @(8000,3000)){
    $listener=Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if($listener){
        Write-Host "[LISTEN] Port $port PID=$($listener[0].OwningProcess)" -ForegroundColor Green
    }else{
        Write-Host "[CLOSED] Port $port" -ForegroundColor Yellow
    }
}