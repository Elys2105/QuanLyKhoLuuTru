#requires -Version 5.1
[CmdletBinding(SupportsShouldProcess=$true,ConfirmImpact="High")]
param(
 [Parameter(Mandatory=$true)][string]$BackupFile,
 [string]$ConfigPath="C:\ProgramData\QuanLyKhoLuuTru\Server\config\database.json",
 [string]$DatabasePassword="",
 [switch]$CleanExistingObjects
)
Set-StrictMode -Version 2.0
$ErrorActionPreference="Stop"
if(-not(Test-Path -LiteralPath $BackupFile)){throw "Khong tim thay $BackupFile"}
if(-not(Test-Path -LiteralPath $ConfigPath)){throw "Khong tim thay $ConfigPath"}
$c=Get-Content -LiteralPath $ConfigPath -Raw|ConvertFrom-Json
if(Test-Path -LiteralPath "$BackupFile.json"){
 $m=Get-Content -LiteralPath "$BackupFile.json" -Raw|ConvertFrom-Json
 $h=(Get-FileHash -LiteralPath $BackupFile -Algorithm SHA256).Hash
 if($m.sha256 -and $m.sha256 -ne $h){throw "SHA256 backup khong khop"}
}
if($DatabasePassword){$env:PGPASSWORD=$DatabasePassword}elseif($c.password -ne "CHANGE_ME"){$env:PGPASSWORD=[string]$c.password}
try{
 $a=@("-h",$c.host,"-p","$($c.port)","-U",$c.user,"-d",$c.database,"--no-owner","--no-privileges","--exit-on-error")
 if($CleanExistingObjects){$a+=@("--clean","--if-exists")}
 $a+=$BackupFile
 if($PSCmdlet.ShouldProcess($c.database,"Restore database")){
  & $c.tools.pg_restore @a
  if($LASTEXITCODE -ne 0){throw "pg_restore that bai"}
  Write-Host "DATABASE RESTORE: PASS" -ForegroundColor Green
 }
}finally{Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue}