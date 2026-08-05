#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$InstallRoot = "C:\Program Files\QuanLyKhoLuuTru\Server",
    [string]$DataRoot = "C:\ProgramData\QuanLyKhoLuuTru\Server",
    [string]$PythonExe = "",
    [string]$NodeExe = ""
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$ApiRoot = Join-Path $InstallRoot "app\api"
$WebRoot = Join-Path $InstallRoot "app\web"
$RuntimeState = Join-Path $DataRoot "runtime"
$LogRoot = Join-Path $DataRoot "logs"

foreach ($dir in @($RuntimeState,$LogRoot)) {
    if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

if (-not $PythonExe) {
    $venvPython = Join-Path $ApiRoot ".venv\Scripts\python.exe"
    if (Test-Path -LiteralPath $venvPython) {
        $PythonExe = $venvPython
    } else {
        $cmd = Get-Command python.exe -ErrorAction SilentlyContinue
        if ($cmd) { $PythonExe = $cmd.Source }
    }
}

if (-not $NodeExe) {
    $cmd = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($cmd) { $NodeExe = $cmd.Source }
}

if (-not $PythonExe -or -not (Test-Path -LiteralPath $PythonExe)) {
    throw "Khong tim thay Python runtime."
}

if (-not $NodeExe -or -not (Test-Path -LiteralPath $NodeExe)) {
    throw "Khong tim thay Node.js runtime."
}

$backendPidFile = Join-Path $RuntimeState "backend.pid"
$frontendPidFile = Join-Path $RuntimeState "frontend.pid"

if (Test-Path -LiteralPath $backendPidFile) {
    $oldPid = Get-Content -LiteralPath $backendPidFile -ErrorAction SilentlyContinue
    if ($oldPid -and (Get-Process -Id ([int]$oldPid) -ErrorAction SilentlyContinue)) {
        Write-Host "[PASS] Backend dang chay PID=$oldPid" -ForegroundColor Green
    } else {
        Remove-Item -LiteralPath $backendPidFile -Force -ErrorAction SilentlyContinue
    }
}

if (-not (Test-Path -LiteralPath $backendPidFile)) {
    $backendOut = Join-Path $LogRoot "backend.out.log"
    $backendErr = Join-Path $LogRoot "backend.err.log"

    $backend = Start-Process `
        -FilePath $PythonExe `
        -ArgumentList @("manage.py","runserver","127.0.0.1:8000","--noreload") `
        -WorkingDirectory $ApiRoot `
        -RedirectStandardOutput $backendOut `
        -RedirectStandardError $backendErr `
        -WindowStyle Hidden `
        -PassThru

    Set-Content -LiteralPath $backendPidFile -Value $backend.Id -Encoding ASCII
    Write-Host "[PASS] Backend started PID=$($backend.Id)" -ForegroundColor Green
}

if (Test-Path -LiteralPath $frontendPidFile) {
    $oldPid = Get-Content -LiteralPath $frontendPidFile -ErrorAction SilentlyContinue
    if ($oldPid -and (Get-Process -Id ([int]$oldPid) -ErrorAction SilentlyContinue)) {
        Write-Host "[PASS] Frontend dang chay PID=$oldPid" -ForegroundColor Green
    } else {
        Remove-Item -LiteralPath $frontendPidFile -Force -ErrorAction SilentlyContinue
    }
}

if (-not (Test-Path -LiteralPath $frontendPidFile)) {
    $frontendOut = Join-Path $LogRoot "frontend.out.log"
    $frontendErr = Join-Path $LogRoot "frontend.err.log"

    $frontend = Start-Process `
        -FilePath $NodeExe `
        -ArgumentList @("node_modules\next\dist\bin\next","start","-H","0.0.0.0","-p","3000") `
        -WorkingDirectory $WebRoot `
        -RedirectStandardOutput $frontendOut `
        -RedirectStandardError $frontendErr `
        -WindowStyle Hidden `
        -PassThru

    Set-Content -LiteralPath $frontendPidFile -Value $frontend.Id -Encoding ASCII
    Write-Host "[PASS] Frontend started PID=$($frontend.Id)" -ForegroundColor Green
}

Start-Sleep -Seconds 3
Write-Host "START SERVER: PASS" -ForegroundColor Green