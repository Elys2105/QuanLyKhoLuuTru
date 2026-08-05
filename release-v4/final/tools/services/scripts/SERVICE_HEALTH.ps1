#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$BackendUrl="http://127.0.0.1:8000",
    [string]$FrontendUrl="http://127.0.0.1:3000"
)

$failed=$false

foreach($name in @("QuanLyKhoLuuTru-Backend","QuanLyKhoLuuTru-Frontend")){
    $svc=Get-Service -Name $name -ErrorAction SilentlyContinue
    if($svc -and $svc.Status -eq "Running"){
        Write-Host "[PASS] $name RUNNING" -ForegroundColor Green
    }else{
        $failed=$true
        Write-Host "[FAIL] $name not running" -ForegroundColor Red
    }
}

foreach($target in @(
    @{Name="Backend";Url=$BackendUrl},
    @{Name="Frontend";Url=$FrontendUrl}
)){
    try{
        $r=Invoke-WebRequest -Uri $target.Url -UseBasicParsing -TimeoutSec 10
        Write-Host "[PASS] $($target.Name) HTTP $($r.StatusCode)" -ForegroundColor Green
    }catch{
        $failed=$true
        Write-Host "[FAIL] $($target.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

if($failed){Write-Host "SERVICE HEALTH: FAIL" -ForegroundColor Red;exit 1}
Write-Host "SERVICE HEALTH: PASS" -ForegroundColor Green