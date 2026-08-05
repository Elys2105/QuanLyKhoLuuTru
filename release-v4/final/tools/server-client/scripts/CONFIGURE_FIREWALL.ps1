#requires -Version 5.1
[CmdletBinding(SupportsShouldProcess=$true,ConfirmImpact="High")]
param(
    [switch]$AllowBackendLan,
    [switch]$RemoveRules
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = "Stop"

$id = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($id)

if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Phai chay PowerShell bang quyen Administrator."
}

$rules = @(
    @{
        Name = "QuanLyKhoLuuTru Frontend 3000"
        Port = 3000
        Enabled = $true
    },
    @{
        Name = "QuanLyKhoLuuTru Backend 8000"
        Port = 8000
        Enabled = [bool]$AllowBackendLan
    }
)

foreach ($rule in $rules) {
    $existing = Get-NetFirewallRule -DisplayName $rule.Name -ErrorAction SilentlyContinue

    if ($RemoveRules) {
        if ($existing -and $PSCmdlet.ShouldProcess($rule.Name,"Remove firewall rule")) {
            Remove-NetFirewallRule -DisplayName $rule.Name
            Write-Host "[PASS] Removed: $($rule.Name)" -ForegroundColor Green
        }
        continue
    }

    if (-not $rule.Enabled) {
        Write-Host "[PASS] Backend port 8000 khong mo ra LAN" -ForegroundColor Green
        continue
    }

    if ($existing) {
        Set-NetFirewallRule -DisplayName $rule.Name -Enabled True -Direction Inbound -Action Allow
        Write-Host "[PASS] Updated: $($rule.Name)" -ForegroundColor Green
    }
    elseif ($PSCmdlet.ShouldProcess($rule.Name,"Create firewall rule")) {
        New-NetFirewallRule `
            -DisplayName $rule.Name `
            -Direction Inbound `
            -Action Allow `
            -Protocol TCP `
            -LocalPort $rule.Port `
            -Profile Private `
            -Enabled True | Out-Null

        Write-Host "[PASS] Created: $($rule.Name)" -ForegroundColor Green
    }
}