#requires -Version 5.1
[CmdletBinding()]
param(
 [string]$ConfigPath="C:\ProgramData\QuanLyKhoLuuTru\Server\config\database.json",
 [string]$DatabasePassword=""
)
Set-StrictMode -Version 2.0
$ErrorActionPreference="Stop"
if(-not(Test-Path -LiteralPath $ConfigPath)){throw "Khong tim thay $ConfigPath"}
$c=Get-Content -LiteralPath $ConfigPath -Raw|ConvertFrom-Json
$root=[string]$c.backup_directory
if(-not(Test-Path -LiteralPath $root)){New-Item -ItemType Directory -Path $root -Force|Out-Null}
$file=Join-Path $root "$($c.database)_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump"
if($DatabasePassword){$env:PGPASSWORD=$DatabasePassword}elseif($c.password -ne "CHANGE_ME"){$env:PGPASSWORD=[string]$c.password}
try{
 & $c.tools.pg_dump -h $c.host -p "$($c.port)" -U $c.user -d $c.database -Fc --no-owner --no-privileges -f $file
 if($LASTEXITCODE -ne 0){throw "pg_dump that bai"}
 $hash=Get-FileHash -LiteralPath $file -Algorithm SHA256
 $item=Get-Item -LiteralPath $file
 [ordered]@{database=$c.database;created_at=(Get-Date).ToString("o");backup_file=$file;size_bytes=$item.Length;sha256=$hash.Hash;format="custom"}|
  ConvertTo-Json -Depth 5|Set-Content -LiteralPath "$file.json" -Encoding UTF8
 Write-Host "[PASS] $file" -ForegroundColor Green
}finally{Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue}