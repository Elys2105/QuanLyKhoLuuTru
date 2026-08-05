param(
    [Parameter(Mandatory = $true)]
    [string]$InstallRoot,

    [Parameter(Mandatory = $true)]
    [string]$DataRoot,

    [string]$StatePath
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ReleaseRoot = Split-Path -Parent (Split-Path -Parent $ScriptRoot)
$CommonModule = Join-Path $ReleaseRoot "scripts\common\V4.Common.psm1"

Import-Module $CommonModule -Force

if (-not $StatePath) {
    $StatePath = Join-Path $ReleaseRoot "rollback\install-state.json"
}

$State = [ordered]@{
    schema_version = 1
    created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
    install_completed = $false
    install_root = $InstallRoot
    data_root = $DataRoot
    created_directories = @()
    created_files = @()
    overwritten_files = @()
    created_services = @()
    created_shortcuts = @()
    created_firewall_rules = @()
    created_registry_keys = @()
    installed_runtimes = @()
    database = [ordered]@{
        server = $null
        port = $null
        database_name = $null
        database_user = $null
        created_database = $false
        created_user = $false
    }
}

Save-V4Json -Path $StatePath -Value $State

Write-Host "Rollback state created:"
Write-Host $StatePath