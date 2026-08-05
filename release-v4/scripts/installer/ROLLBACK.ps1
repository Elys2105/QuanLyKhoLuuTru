param(
    [string]$StatePath,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ReleaseRoot = Split-Path -Parent (Split-Path -Parent $ScriptRoot)
$CommonModule = Join-Path $ReleaseRoot "scripts\common\V4.Common.psm1"
$LogPath = Join-Path $ReleaseRoot "logs\rollback.log"

Import-Module $CommonModule -Force

if (-not $StatePath) {
    $StatePath = Join-Path $ReleaseRoot "rollback\install-state.json"
}

if (-not (Test-Path -LiteralPath $StatePath)) {
    throw "Rollback state not found: $StatePath"
}

$State = Read-V4Json -Path $StatePath

Write-V4Log -Message "Rollback started" -Level WARN -LogPath $LogPath

foreach ($ServiceName in @($State.created_services)) {
    try {
        $Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

        if ($Service) {
            if ($Service.Status -ne "Stopped") {
                Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
            }

            & sc.exe delete $ServiceName | Out-Null
        }

        Write-V4Log `
            -Message "Removed service: $ServiceName" `
            -Level PASS `
            -LogPath $LogPath
    }
    catch {
        Write-V4Log `
            -Message "Failed to remove service $ServiceName`: $($_.Exception.Message)" `
            -Level ERROR `
            -LogPath $LogPath
    }
}

foreach ($ShortcutPath in @($State.created_shortcuts)) {
    try {
        if (Test-Path -LiteralPath $ShortcutPath) {
            Remove-Item -LiteralPath $ShortcutPath -Force
        }

        Write-V4Log `
            -Message "Removed shortcut: $ShortcutPath" `
            -Level PASS `
            -LogPath $LogPath
    }
    catch {
        Write-V4Log `
            -Message "Failed to remove shortcut $ShortcutPath" `
            -Level ERROR `
            -LogPath $LogPath
    }
}

foreach ($RuleName in @($State.created_firewall_rules)) {
    try {
        Remove-NetFirewallRule `
            -DisplayName $RuleName `
            -ErrorAction SilentlyContinue

        Write-V4Log `
            -Message "Removed firewall rule: $RuleName" `
            -Level PASS `
            -LogPath $LogPath
    }
    catch {
        Write-V4Log `
            -Message "Failed to remove firewall rule $RuleName" `
            -Level ERROR `
            -LogPath $LogPath
    }
}

foreach ($RegistryPath in @($State.created_registry_keys)) {
    try {
        if (Test-Path -LiteralPath $RegistryPath) {
            Remove-Item -LiteralPath $RegistryPath -Recurse -Force
        }

        Write-V4Log `
            -Message "Removed registry key: $RegistryPath" `
            -Level PASS `
            -LogPath $LogPath
    }
    catch {
        Write-V4Log `
            -Message "Failed to remove registry key $RegistryPath" `
            -Level ERROR `
            -LogPath $LogPath
    }
}

foreach ($FilePath in @($State.created_files)) {
    try {
        if (Test-Path -LiteralPath $FilePath -PathType Leaf) {
            Remove-Item -LiteralPath $FilePath -Force
        }

        Write-V4Log `
            -Message "Removed file: $FilePath" `
            -Level PASS `
            -LogPath $LogPath
    }
    catch {
        Write-V4Log `
            -Message "Failed to remove file $FilePath" `
            -Level ERROR `
            -LogPath $LogPath
    }
}

$CreatedDirectories = @($State.created_directories) |
    Sort-Object { $_.Length } -Descending

foreach ($DirectoryPath in $CreatedDirectories) {
    try {
        if (Test-Path -LiteralPath $DirectoryPath -PathType Container) {
            $Children = Get-ChildItem `
                -LiteralPath $DirectoryPath `
                -Force `
                -ErrorAction SilentlyContinue

            if ($null -eq $Children -or $Children.Count -eq 0) {
                Remove-Item -LiteralPath $DirectoryPath -Force
            }
        }

        Write-V4Log `
            -Message "Processed directory: $DirectoryPath" `
            -Level PASS `
            -LogPath $LogPath
    }
    catch {
        Write-V4Log `
            -Message "Failed to process directory $DirectoryPath" `
            -Level ERROR `
            -LogPath $LogPath
    }
}

Write-V4Log -Message "Rollback finished" -Level PASS -LogPath $LogPath