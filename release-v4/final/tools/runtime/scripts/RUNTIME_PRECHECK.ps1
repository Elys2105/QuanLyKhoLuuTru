#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$InstallRoot = "C:\Program Files\QuanLyKhoLuuTru\Server",
    [string]$DataRoot = "C:\ProgramData\QuanLyKhoLuuTru\Server"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$failures = New-Object System.Collections.Generic.List[string]

function Check-Path {
    param([string]$Path, [string]$Label)
    if (Test-Path -LiteralPath $Path) {
        Write-Host "[PASS] $Label" -ForegroundColor Green
    } else {
        [void]$failures.Add("$Label - $Path")
        Write-Host "[FAIL] $Label - $Path" -ForegroundColor Red
    }
}

Check-Path (Join-Path $InstallRoot "app\api\manage.py") "Django manage.py"
Check-Path (Join-Path $InstallRoot "app\web\package.json") "Frontend package.json"

foreach ($dir in @(
    $DataRoot,
    (Join-Path $DataRoot "media"),
    (Join-Path $DataRoot "logs"),
    (Join-Path $DataRoot "runtime"),
    (Join-Path $DataRoot "config")
)) {
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    Check-Path $dir "Runtime directory"
}

foreach ($port in @(8000,3000,5432)) {
    $used = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($used) {
        Write-Host "[WARN] Port $port dang duoc su dung" -ForegroundColor Yellow
    } else {
        Write-Host "[PASS] Port $port available" -ForegroundColor Green
    }
}

if ($failures.Count -gt 0) {
    Write-Host "RUNTIME PRECHECK: FAIL" -ForegroundColor Red
    exit 1
}

Write-Host "RUNTIME PRECHECK: PASS" -ForegroundColor Green
exit 0