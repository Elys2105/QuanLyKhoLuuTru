#requires -Version 5.1
[CmdletBinding(SupportsShouldProcess=$true,ConfirmImpact="High")]
param(
    [string]$ConfigPath = "C:\Program Files\QuanLyKhoLuuTru\Server\services\config\services.json"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$id=[Security.Principal.WindowsIdentity]::GetCurrent()
$p=New-Object Security.Principal.WindowsPrincipal($id)
if(-not $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){
    throw "Phai chay PowerShell bang quyen Administrator."
}

if(-not(Test-Path -LiteralPath $ConfigPath)){throw "Khong tim thay $ConfigPath"}
$c=Get-Content -LiteralPath $ConfigPath -Raw|ConvertFrom-Json
$nssm=[string]$c.nssm.deployed_path
if(-not(Test-Path -LiteralPath $nssm)){throw "Khong tim thay NSSM: $nssm"}

foreach($item in @($c.frontend,$c.backend)){
    $name=[string]$item.service_name
    $svc=Get-Service -Name $name -ErrorAction SilentlyContinue
    if(-not $svc){
        Write-Host "[PASS] Service khong ton tai: $name" -ForegroundColor Green
        continue
    }

    if($PSCmdlet.ShouldProcess($name,"Stop and remove Windows Service")){
        if($svc.Status -ne "Stopped"){
            Stop-Service -Name $name -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        }

        & $nssm remove $name confirm
        if($LASTEXITCODE -ne 0){throw "Khong go duoc service: $name"}

        Write-Host "[PASS] Removed: $name" -ForegroundColor Green
    }
}