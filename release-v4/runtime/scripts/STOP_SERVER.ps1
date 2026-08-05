#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$DataRoot = "C:\ProgramData\QuanLyKhoLuuTru\Server"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$RuntimeState = Join-Path $DataRoot "runtime"

foreach ($name in @("backend","frontend")) {
    $pidFile = Join-Path $RuntimeState "$name.pid"

    if (-not (Test-Path -LiteralPath $pidFile)) {
        Write-Host "[PASS] $name da dung"
        continue
    }

    $pidText = Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue
    if ($pidText) {
        $pidValue = [int]$pidText
        $process = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
        if ($process) {
            Stop-Process -Id $pidValue -Force -ErrorAction Stop
            Write-Host "[PASS] Stopped $name PID=$pidValue" -ForegroundColor Green
        }
    }

    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

Write-Host "STOP SERVER: PASS" -ForegroundColor Green