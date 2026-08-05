#requires -Version 5.1
[CmdletBinding(SupportsShouldProcess=$true,ConfirmImpact="High")]
param(
 [string]$ConfigPath="C:\ProgramData\QuanLyKhoLuuTru\Server\config\database.json",
 [string]$AdminPassword="",
 [switch]$CreateRole,
 [switch]$CreateDatabase
)
Set-StrictMode -Version 2.0
$ErrorActionPreference="Stop"
if(-not(Test-Path -LiteralPath $ConfigPath)){throw "Khong tim thay $ConfigPath"}
$c=Get-Content -LiteralPath $ConfigPath -Raw|ConvertFrom-Json
if($AdminPassword){$env:PGPASSWORD=$AdminPassword}
try{
 if($CreateRole -and $PSCmdlet.ShouldProcess($c.user,"Create PostgreSQL role if missing")){
  $pw=([string]$c.password).Replace("'","''")
  $sql="DO `$do`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$($c.user)') THEN CREATE ROLE `"$($c.user)`" LOGIN PASSWORD '$pw'; END IF; END `$do`$;"
  & $c.tools.psql -h $c.host -p "$($c.port)" -U $c.admin_user -d $c.admin_database -v ON_ERROR_STOP=1 -c $sql
  if($LASTEXITCODE -ne 0){throw "Tao role that bai"}
 }
 if($CreateDatabase){
  $exists=& $c.tools.psql -h $c.host -p "$($c.port)" -U $c.admin_user -d $c.admin_database -tAc "SELECT 1 FROM pg_database WHERE datname='$($c.database)';"
  if(($exists -join "").Trim() -eq "1"){Write-Host "[PASS] Database da ton tai" -ForegroundColor Green}
  elseif($PSCmdlet.ShouldProcess($c.database,"Create PostgreSQL database")){
   & $c.tools.createdb -h $c.host -p "$($c.port)" -U $c.admin_user -O $c.user $c.database
   if($LASTEXITCODE -ne 0){throw "Tao database that bai"}
  }
 }
}finally{Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue}