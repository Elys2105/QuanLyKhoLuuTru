#requires -Version 5.1
[CmdletBinding(SupportsShouldProcess=$true,ConfirmImpact="High")]
param(
    [switch]$RemoveServer,
    [switch]$RemoveClient,
    [switch]$KeepData = $true
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

if (-not $RemoveServer -and -not $RemoveClient) {
    Write-Host "Dung -RemoveServer, -RemoveClient hoac ca hai."
    exit 0
}

if ($RemoveClient) {
    $clientRoot = "C:\Program Files\QuanLyKhoLuuTru\Client"
    $uninstall = Join-Path $clientRoot "unins000.exe"

    if (Test-Path -LiteralPath $uninstall) {
        if ($PSCmdlet.ShouldProcess("QuanLyKhoLuuTru Client","Uninstall")) {
            Start-Process -FilePath $uninstall -ArgumentList "/SILENT" -Wait
        }
    }
}

if ($RemoveServer) {
    foreach ($name in @("QuanLyKhoLuuTru-Frontend","QuanLyKhoLuuTru-Backend")) {
        $service = Get-Service -Name $name -ErrorAction SilentlyContinue

        if ($service) {
            if ($service.Status -ne "Stopped") {
                Stop-Service -Name $name -Force -ErrorAction SilentlyContinue
            }

            sc.exe delete $name | Out-Null
        }
    }

    $serverRoot = "C:\Program Files\QuanLyKhoLuuTru\Server"
    $uninstall = Join-Path $serverRoot "unins000.exe"

    if (Test-Path -LiteralPath $uninstall) {
        if ($PSCmdlet.ShouldProcess("QuanLyKhoLuuTru Server","Uninstall")) {
            Start-Process -FilePath $uninstall -ArgumentList "/SILENT" -Wait
        }
    }
}

if (-not $KeepData) {
    $dataRoot = "C:\ProgramData\QuanLyKhoLuuTru"

    if (Test-Path -LiteralPath $dataRoot) {
        if ($PSCmdlet.ShouldProcess($dataRoot,"Delete all application data")) {
            Remove-Item -LiteralPath $dataRoot -Recurse -Force
        }
    }
}

Write-Host "UNINSTALL V4: PASS" -ForegroundColor Green