Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-V4Log {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,

        [ValidateSet("INFO", "PASS", "WARN", "ERROR")]
        [string]$Level = "INFO",

        [string]$LogPath
    )

    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $Line = "[$Timestamp][$Level] $Message"

    switch ($Level) {
        "PASS"  { Write-Host $Line -ForegroundColor Green }
        "WARN"  { Write-Host $Line -ForegroundColor Yellow }
        "ERROR" { Write-Host $Line -ForegroundColor Red }
        default { Write-Host $Line }
    }

    if ($LogPath) {
        $Parent = Split-Path -Parent $LogPath

        if (-not (Test-Path -LiteralPath $Parent)) {
            New-Item -ItemType Directory -Path $Parent -Force | Out-Null
        }

        Add-Content -LiteralPath $LogPath -Value $Line -Encoding UTF8
    }
}

function Test-V4Administrator {
    $Identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $Principal = New-Object Security.Principal.WindowsPrincipal($Identity)

    return $Principal.IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator
    )
}

function Test-V4DirectoryWritable {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    try {
        if (-not (Test-Path -LiteralPath $Path)) {
            New-Item -ItemType Directory -Path $Path -Force | Out-Null
        }

        $TestFile = Join-Path $Path ".v4_write_test_$([guid]::NewGuid().ToString('N')).tmp"
        Set-Content -LiteralPath $TestFile -Value "test" -Encoding UTF8
        Remove-Item -LiteralPath $TestFile -Force

        return $true
    }
    catch {
        return $false
    }
}

function Test-V4PortAvailable {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    try {
        $Listener = New-Object System.Net.Sockets.TcpListener(
            [System.Net.IPAddress]::Loopback,
            $Port
        )

        $Listener.Start()
        $Listener.Stop()

        return $true
    }
    catch {
        return $false
    }
}

function Get-V4FreeSpaceBytes {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $Root = [System.IO.Path]::GetPathRoot($Path)
    $DriveName = $Root.TrimEnd("\").TrimEnd(":")
    $Drive = Get-PSDrive -Name $DriveName -PSProvider FileSystem

    return [int64]$Drive.Free
}

function Save-V4Json {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,

        [Parameter(Mandatory = $true)]
        [object]$Value
    )

    $Encoding = New-Object System.Text.UTF8Encoding($false)
    $Content = $Value | ConvertTo-Json -Depth 30
    $Parent = Split-Path -Parent $Path

    if (-not (Test-Path -LiteralPath $Parent)) {
        New-Item -ItemType Directory -Path $Parent -Force | Out-Null
    }

    [System.IO.File]::WriteAllText($Path, $Content, $Encoding)
}

function Read-V4Json {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
}

Export-ModuleMember -Function @(
    "Write-V4Log",
    "Test-V4Administrator",
    "Test-V4DirectoryWritable",
    "Test-V4PortAvailable",
    "Get-V4FreeSpaceBytes",
    "Save-V4Json",
    "Read-V4Json"
)