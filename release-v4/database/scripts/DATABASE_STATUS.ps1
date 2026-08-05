#requires -Version 5.1
[CmdletBinding()]
param(
 [string]$ConfigPath="C:\ProgramData\QuanLyKhoLuuTru\Server\config\database.json",
 [string]$DatabasePassword=""
)
Set-StrictMode -Version 2.0
$ErrorActionPreference="Stop"
$c=Get-Content -LiteralPath $ConfigPath -Raw|ConvertFrom-Json
& $c.tools.pg_isready -h $c.host -p "$($c.port)" -t "$($c.connect_timeout_seconds)"
if($LASTEXITCODE -ne 0){exit 1}
if($DatabasePassword){$env:PGPASSWORD=$DatabasePassword}elseif($c.password -ne "CHANGE_ME"){$env:PGPASSWORD=[string]$c.password}
try{
 & $c.tools.psql -h $c.host -p "$($c.port)" -U $c.user -d $c.database -v ON_ERROR_STOP=1 -c "SELECT current_database(),current_user,version(),pg_size_pretty(pg_database_size(current_database()));"
 if($LASTEXITCODE -ne 0){throw "Database query that bai"}
 Write-Host "DATABASE STATUS: PASS" -ForegroundColor Green
}finally{Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue}