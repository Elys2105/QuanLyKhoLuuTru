#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ConfigPath = "C:\Program Files\QuanLyKhoLuuTru\Server\health\config\health.json",
    [string]$ReportPath = "C:\ProgramData\QuanLyKhoLuuTru\Server\logs\health-report.json"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "Khong tim thay health config: $ConfigPath"
}

$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$checks = New-Object System.Collections.Generic.List[object]
$failed = $false
$warned = $false

function Add-Check {
    param(
        [string]$Name,
        [string]$Status,
        [string]$Detail
    )

    [void]$checks.Add([ordered]@{
        name = $Name
        status = $Status
        detail = $Detail
        checked_at = (Get-Date).ToString("o")
    })

    switch ($Status) {
        "PASS" { Write-Host "[PASS] $Name - $Detail" -ForegroundColor Green }
        "WARN" {
            $script:warned = $true
            Write-Host "[WARN] $Name - $Detail" -ForegroundColor Yellow
        }
        "FAIL" {
            $script:failed = $true
            Write-Host "[FAIL] $Name - $Detail" -ForegroundColor Red
        }
    }
}

$installRoot = [string]$config.install_root
$dataRoot = [string]$config.data_root

foreach ($path in @(
    (Join-Path $installRoot "app\api\manage.py"),
    (Join-Path $installRoot "app\web\package.json"),
    $dataRoot,
    (Join-Path $dataRoot "media"),
    (Join-Path $dataRoot "logs"),
    (Join-Path $dataRoot "config")
)) {
    if (Test-Path -LiteralPath $path) {
        Add-Check "Path" "PASS" $path
    }
    else {
        Add-Check "Path" "FAIL" $path
    }
}

foreach ($serviceName in $config.services) {
    $service = Get-CimInstance Win32_Service -Filter "Name='$serviceName'" -ErrorAction SilentlyContinue

    if (-not $service) {
        Add-Check "Service $serviceName" "WARN" "Missing"
    }
    elseif ($service.State -eq "Running") {
        Add-Check "Service $serviceName" "PASS" "Running PID=$($service.ProcessId)"
    }
    else {
        Add-Check "Service $serviceName" "FAIL" $service.State
    }
}

foreach ($entry in @(
    @{Name="Frontend";Port=[int]$config.ports.frontend;Required=$true},
    @{Name="Backend";Port=[int]$config.ports.backend;Required=$true},
    @{Name="PostgreSQL";Port=[int]$config.ports.postgresql;Required=$false}
)) {
    $listener = Get-NetTCPConnection -LocalPort $entry.Port -State Listen -ErrorAction SilentlyContinue

    if ($listener) {
        Add-Check "Port $($entry.Port)" "PASS" "$($entry.Name) PID=$($listener[0].OwningProcess)"
    }
    elseif ($entry.Required) {
        Add-Check "Port $($entry.Port)" "FAIL" "$($entry.Name) closed"
    }
    else {
        Add-Check "Port $($entry.Port)" "WARN" "$($entry.Name) closed"
    }
}

foreach ($target in @(
    @{Name="Frontend";Url=[string]$config.endpoints.frontend},
    @{Name="Backend";Url=[string]$config.endpoints.backend}
)) {
    try {
        $watch = [Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest `
            -Uri $target.Url `
            -UseBasicParsing `
            -TimeoutSec ([int]$config.thresholds.maximum_response_seconds)
        $watch.Stop()

        Add-Check $target.Name "PASS" "HTTP $($response.StatusCode), $([Math]::Round($watch.Elapsed.TotalSeconds,2))s"
    }
    catch {
        Add-Check $target.Name "FAIL" $_.Exception.Message
    }
}

$systemDrive = Get-PSDrive -Name ([IO.Path]::GetPathRoot($dataRoot).TrimEnd(":\"))
if ($systemDrive) {
    $freeGb = [Math]::Round($systemDrive.Free / 1GB,2)

    if ($freeGb -ge [double]$config.thresholds.minimum_free_disk_gb) {
        Add-Check "Disk free" "PASS" "$freeGb GB"
    }
    else {
        Add-Check "Disk free" "FAIL" "$freeGb GB"
    }
}

$backupRoot = Join-Path $dataRoot "backups"
if (Test-Path -LiteralPath $backupRoot) {
    $latest = Get-ChildItem -LiteralPath $backupRoot -Directory -Filter "full_*" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if ($latest) {
        $ageHours = [Math]::Round(((Get-Date) - $latest.LastWriteTime).TotalHours,2)

        if ($ageHours -le [double]$config.thresholds.backup_max_age_hours) {
            Add-Check "Latest backup" "PASS" "$($latest.Name), $ageHours hours"
        }
        else {
            Add-Check "Latest backup" "WARN" "$($latest.Name), $ageHours hours"
        }
    }
    else {
        Add-Check "Latest backup" "WARN" "No full backup"
    }
}
else {
    Add-Check "Backup root" "WARN" "Missing"
}

$logRoot = Join-Path $dataRoot "logs"
if (Test-Path -LiteralPath $logRoot) {
    foreach ($log in Get-ChildItem -LiteralPath $logRoot -File -ErrorAction SilentlyContinue) {
        $sizeMb = [Math]::Round($log.Length / 1MB,2)

        if ($sizeMb -gt [double]$config.thresholds.maximum_log_size_mb) {
            Add-Check "Log size" "WARN" "$($log.Name) $sizeMb MB"
        }
    }
}

$status = if ($failed) { "FAIL" } elseif ($warned) { "WARN" } else { "PASS" }

$report = [ordered]@{
    project = "QuanLyKhoLuuTru"
    generated_at = (Get-Date).ToString("o")
    status = $status
    computer = $env:COMPUTERNAME
    checks = @($checks)
}

$parent = Split-Path -Parent $ReportPath
if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
}

$report | ConvertTo-Json -Depth 10 |
    Set-Content -LiteralPath $ReportPath -Encoding UTF8

Write-Host "HEALTH CHECK FULL: $status" -ForegroundColor $(if($status -eq "PASS"){"Green"}elseif($status -eq "WARN"){"Yellow"}else{"Red"})
Write-Host "REPORT: $ReportPath"

if ($failed) { exit 1 }
exit 0