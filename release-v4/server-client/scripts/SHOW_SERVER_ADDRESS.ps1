#requires -Version 5.1
[CmdletBinding()]
param()

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$adapters = @(
    Get-NetIPConfiguration |
    Where-Object {
        $_.IPv4Address -and
        $_.NetAdapter.Status -eq "Up" -and
        $_.IPv4DefaultGateway
    }
)

if ($adapters.Count -eq 0) {
    Write-Host "[FAIL] Khong tim thay dia chi IPv4 LAN" -ForegroundColor Red
    exit 1
}

foreach ($adapter in $adapters) {
    $ip = [string]$adapter.IPv4Address.IPAddress

    Write-Host "Interface : $($adapter.InterfaceAlias)"
    Write-Host "IPv4      : $ip"
    Write-Host "Client URL: http://${ip}:3000"
    Write-Host "Backend   : http://${ip}:8000"
    Write-Host ""
}