#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$DataRoot = "C:\ProgramData\QuanLyKhoLuuTru\Server"
)

$RuntimeState = Join-Path $DataRoot "runtime"

foreach ($name in @("backend","frontend")) {
    $pidFile = Join-Path $RuntimeState "$name.pid"

    if (-not (Test-Path -LiteralPath $pidFile)) {
        Write-Host "[STOPPED] $name" -ForegroundColor Yellow
        continue
    }

    $pidText = Get-Content -LiteralPath $pidFile -ErrorAction SilentlyContinue
    $process = $null

    if ($pidText) {
        $process = Get-Process -Id ([int]$pidText) -ErrorAction SilentlyContinue
    }

    if ($process) {
        Write-Host "[RUNNING] $name PID=$($process.Id) CPU=$([Math]::Round($process.CPU,2)) RAM_MB=$([Math]::Round($process.WorkingSet64/1MB,2))" -ForegroundColor Green
    } else {
        Write-Host "[STALE] $name PID file khong con process" -ForegroundColor Red
    }
}

foreach ($port in @(8000,3000,5432)) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    if ($listener) {
        Write-Host "[LISTEN] Port $port PID=$($listener[0].OwningProcess)" -ForegroundColor Green
    } else {
        Write-Host "[CLOSED] Port $port" -ForegroundColor Yellow
    }
}