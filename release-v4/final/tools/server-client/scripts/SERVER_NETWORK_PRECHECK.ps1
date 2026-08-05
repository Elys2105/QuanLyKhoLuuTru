#requires -Version 5.1
[CmdletBinding()]
param()

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$failed = $false

$profiles = Get-NetConnectionProfile -ErrorAction SilentlyContinue
foreach ($profile in $profiles) {
    Write-Host "Network: $($profile.Name) Category=$($profile.NetworkCategory)"
    if ($profile.NetworkCategory -eq "Public") {
        Write-Host "[WARN] Mang dang o che do Public; firewall co the chan Client." -ForegroundColor Yellow
    }
}

$ips = @(
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.254.*"
    }
)

if ($ips.Count -eq 0) {
    $failed = $true
    Write-Host "[FAIL] Khong co IPv4 LAN" -ForegroundColor Red
}
else {
    foreach ($ip in $ips) {
        Write-Host "[PASS] IPv4: $($ip.IPAddress) Interface=$($ip.InterfaceAlias)" -ForegroundColor Green
    }
}

foreach ($port in @(3000,8000)) {
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($listener) {
        Write-Host "[PASS] Port $port LISTEN PID=$($listener[0].OwningProcess)" -ForegroundColor Green
    }
    else {
        Write-Host "[WARN] Port $port chua LISTEN" -ForegroundColor Yellow
    }
}

if ($failed) {
    Write-Host "SERVER NETWORK PRECHECK: FAIL" -ForegroundColor Red
    exit 1
}

Write-Host "SERVER NETWORK PRECHECK: PASS" -ForegroundColor Green