#requires -Version 5.1
[CmdletBinding()]
param([string]$ConfigPath="C:\ProgramData\QuanLyKhoLuuTru\Server\config\database.json")
Set-StrictMode -Version 2.0
$ErrorActionPreference="Stop"
if(-not(Test-Path -LiteralPath $ConfigPath)){throw "Khong tim thay $ConfigPath"}
$c=Get-Content -LiteralPath $ConfigPath -Raw|ConvertFrom-Json
$failed=$false
foreach($n in @("psql","pg_dump","pg_restore","createdb","pg_isready")){
    $p=[string]$c.tools.$n
    if($p -and (Test-Path -LiteralPath $p)){Write-Host "[PASS] $n - $p" -ForegroundColor Green}
    else{$failed=$true;Write-Host "[FAIL] $n" -ForegroundColor Red}
}
& $c.tools.pg_isready -h $c.host -p "$($c.port)" -t "$($c.connect_timeout_seconds)"
if($LASTEXITCODE -ne 0){$failed=$true}
if($failed){Write-Host "DATABASE PRECHECK: FAIL" -ForegroundColor Red;exit 1}
Write-Host "DATABASE PRECHECK: PASS" -ForegroundColor Green