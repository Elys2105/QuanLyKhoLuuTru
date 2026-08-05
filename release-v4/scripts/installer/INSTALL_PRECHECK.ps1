param(
    [string]$InstallRoot = "C:\Program Files\QuanLyKhoLuuTru",
    [string]$DataRoot = "C:\ProgramData\QuanLyKhoLuuTru",
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3000,
    [int]$PostgreSqlPort = 5432,
    [int64]$MinimumFreeBytes = 16106127360,
    [string]$ResultPath
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ReleaseRoot = Split-Path -Parent (Split-Path -Parent $ScriptRoot)
$CommonModule = Join-Path $ReleaseRoot "scripts\common\V4.Common.psm1"
$LogPath = Join-Path $ReleaseRoot "logs\installer-precheck.log"

Import-Module $CommonModule -Force

if (-not $ResultPath) {
    $ResultPath = Join-Path $ReleaseRoot "config\installer-precheck-result.json"
}

$Failures = New-Object System.Collections.Generic.List[string]
$Warnings = New-Object System.Collections.Generic.List[string]

Write-V4Log -Message "Starting installer precheck" -Level INFO -LogPath $LogPath

if (-not [Environment]::Is64BitOperatingSystem) {
    $Failures.Add("Windows 64-bit is required")
}

if (-not (Test-V4Administrator)) {
    $Failures.Add("Administrator privilege is required")
}

if (-not (Test-V4DirectoryWritable -Path $InstallRoot)) {
    $Failures.Add("Install directory is not writable: $InstallRoot")
}

if (-not (Test-V4DirectoryWritable -Path $DataRoot)) {
    $Failures.Add("Data directory is not writable: $DataRoot")
}

$FreeBytes = Get-V4FreeSpaceBytes -Path $InstallRoot

if ($FreeBytes -lt $MinimumFreeBytes) {
    $Failures.Add(
        "Insufficient disk space. Required bytes: $MinimumFreeBytes"
    )
}

$Ports = @(
    [ordered]@{ name = "Backend"; port = $BackendPort },
    [ordered]@{ name = "Frontend"; port = $FrontendPort },
    [ordered]@{ name = "PostgreSQL"; port = $PostgreSqlPort }
)

$PortResults = @()

foreach ($PortItem in $Ports) {
    $Available = Test-V4PortAvailable -Port $PortItem.port

    $PortResults += [ordered]@{
        name = $PortItem.name
        port = $PortItem.port
        available = $Available
    }

    if (-not $Available) {
        $Warnings.Add(
            "$($PortItem.name) port $($PortItem.port) is already in use"
        )
    }
}

$Result = [ordered]@{
    generated_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
    passed = ($Failures.Count -eq 0)
    install_root = $InstallRoot
    data_root = $DataRoot
    free_bytes = $FreeBytes
    required_bytes = $MinimumFreeBytes
    ports = $PortResults
    warnings = @($Warnings)
    failures = @($Failures)
}

Save-V4Json -Path $ResultPath -Value $Result

if ($Result.passed) {
    Write-V4Log -Message "Installer precheck PASS" -Level PASS -LogPath $LogPath
    exit 0
}

foreach ($Failure in $Failures) {
    Write-V4Log -Message $Failure -Level ERROR -LogPath $LogPath
}

Write-V4Log -Message "Installer precheck FAIL" -Level ERROR -LogPath $LogPath
exit 1