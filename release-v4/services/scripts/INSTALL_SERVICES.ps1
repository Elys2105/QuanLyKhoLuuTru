#requires -Version 5.1
[CmdletBinding(SupportsShouldProcess=$true,ConfirmImpact="High")]
param(
    [string]$ConfigPath = "C:\Program Files\QuanLyKhoLuuTru\Server\services\config\services.json",
    [switch]$StartAfterInstall
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

function Require-Admin {
    $id=[Security.Principal.WindowsIdentity]::GetCurrent()
    $p=New-Object Security.Principal.WindowsPrincipal($id)
    if(-not $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){
        throw "Phai chay PowerShell bang quyen Administrator."
    }
}

Require-Admin

if(-not(Test-Path -LiteralPath $ConfigPath)){throw "Khong tim thay $ConfigPath"}
$c=Get-Content -LiteralPath $ConfigPath -Raw|ConvertFrom-Json
$nssm=[string]$c.nssm.deployed_path
if(-not(Test-Path -LiteralPath $nssm)){throw "Khong tim thay NSSM: $nssm"}

foreach($dir in @(
    $c.data_root,
    (Join-Path $c.data_root "logs"),
    (Join-Path $c.data_root "runtime")
)){
    if(-not(Test-Path -LiteralPath $dir)){New-Item -ItemType Directory -Path $dir -Force|Out-Null}
}

foreach($item in @($c.backend,$c.frontend)){
    $name=[string]$item.service_name
    $existing=Get-Service -Name $name -ErrorAction SilentlyContinue

    if($existing){
        Write-Host "[PASS] Service da ton tai: $name" -ForegroundColor Green
        continue
    }

    $exe=[string]$item.executable
    if(-not(Test-Path -LiteralPath $exe)){
        $fallback=Get-Command ([string]$item.fallback_executable) -ErrorAction SilentlyContinue
        if($fallback){$exe=$fallback.Source}
    }
    if(-not(Test-Path -LiteralPath $exe)){throw "Khong tim thay executable cho $name"}

    if($PSCmdlet.ShouldProcess($name,"Install Windows Service")){
        & $nssm install $name $exe
        if($LASTEXITCODE -ne 0){throw "NSSM install that bai: $name"}

        & $nssm set $name AppDirectory ([string]$item.working_directory)
        & $nssm set $name AppParameters ([string]$item.arguments)
        & $nssm set $name DisplayName ([string]$item.display_name)
        & $nssm set $name Description ([string]$item.description)
        & $nssm set $name Start ([string]$item.start)
        & $nssm set $name AppStdout ([string]$item.stdout)
        & $nssm set $name AppStderr ([string]$item.stderr)
        & $nssm set $name AppRotateFiles 1
        & $nssm set $name AppRotateOnline 1
        & $nssm set $name AppRotateBytes 10485760
        & $nssm set $name AppExit Default Restart
        & $nssm set $name AppThrottle 5000

        sc.exe failure $name reset= 86400 actions= restart/5000/restart/15000/restart/60000 | Out-Null
        sc.exe failureflag $name 1 | Out-Null

        Write-Host "[PASS] Installed: $name" -ForegroundColor Green
    }
}

if($StartAfterInstall){
    foreach($item in @($c.backend,$c.frontend)){
        Start-Service -Name ([string]$item.service_name) -ErrorAction Stop
        Write-Host "[PASS] Started: $($item.service_name)" -ForegroundColor Green
    }
}