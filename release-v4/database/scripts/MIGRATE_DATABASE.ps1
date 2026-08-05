#requires -Version 5.1
[CmdletBinding(SupportsShouldProcess=$true,ConfirmImpact="High")]
param(
 [string]$InstallRoot="C:\Program Files\QuanLyKhoLuuTru\Server",
 [string]$PythonExe="",
 [switch]$CheckOnly
)
Set-StrictMode -Version 2.0
$ErrorActionPreference="Stop"
$api=Join-Path $InstallRoot "app\api"
$manage=Join-Path $api "manage.py"
if(-not(Test-Path -LiteralPath $manage)){throw "Khong tim thay $manage"}
if(-not $PythonExe){
 $venv=Join-Path $api ".venv\Scripts\python.exe"
 if(Test-Path -LiteralPath $venv){$PythonExe=$venv}else{$cmd=Get-Command python.exe -ErrorAction SilentlyContinue;if($cmd){$PythonExe=$cmd.Source}}
}
if(-not $PythonExe){throw "Khong tim thay Python"}
Push-Location $api
try{
 & $PythonExe $manage check
 if($LASTEXITCODE -ne 0){throw "Django check that bai"}
 & $PythonExe $manage showmigrations --plan
 if($LASTEXITCODE -ne 0){throw "Migration plan that bai"}
 if($CheckOnly){Write-Host "MIGRATION CHECK: PASS" -ForegroundColor Green;exit 0}
 if($PSCmdlet.ShouldProcess("Django database","Apply migrations")){
  & $PythonExe $manage migrate --noinput
  if($LASTEXITCODE -ne 0){throw "Django migrate that bai"}
  Write-Host "DATABASE MIGRATE: PASS" -ForegroundColor Green
 }
}finally{Pop-Location}