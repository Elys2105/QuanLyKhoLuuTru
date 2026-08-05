#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ConfigPath = "C:\ProgramData\QuanLyKhoLuuTru\Client\client.json"
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$url = "http://127.0.0.1:3000"

if (Test-Path -LiteralPath $ConfigPath) {
    try {
        $config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
        if ($config.server_url) {
            $url = [string]$config.server_url
        }
    }
    catch {
        Write-Warning "client.json khong hop le. Dung URL mac dinh."
    }
}

try {
    $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        Start-Process $url
        exit 0
    }
}
catch {
    Write-Warning "Khong ket noi duoc may chu: $url"
}

Add-Type -AssemblyName PresentationFramework
[System.Windows.MessageBox]::Show(
    "Khong ket noi duoc den he thong tai:`n$url`n`nHay kiem tra Server va ket noi mang.",
    "Quan Ly Kho Luu Tru",
    "OK",
    "Warning"
) | Out-Null

exit 1