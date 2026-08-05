param(
    [string]$ReleaseRoot = "D:\archive-management\release-v4"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$PayloadRoot = Join-Path $ReleaseRoot "payload"
$ManifestRoot = Join-Path $ReleaseRoot "manifest"
$ManifestPath = Join-Path $ManifestRoot "payload-manifest.csv"
$SummaryPath = Join-Path $ManifestRoot "payload-summary.json"
$Utf8 = New-Object System.Text.UTF8Encoding($false)

New-Item -ItemType Directory -Path $ManifestRoot -Force | Out-Null
if (Test-Path -LiteralPath $ManifestPath) { Remove-Item -LiteralPath $ManifestPath -Force }

$Rows = Get-ChildItem -LiteralPath $PayloadRoot -File -Recurse -Force -ErrorAction Stop |
    ForEach-Object {
        [pscustomobject]@{
            payload = if ($_.FullName.StartsWith((Join-Path $PayloadRoot "server"), [StringComparison]::OrdinalIgnoreCase)) { "server" } else { "client" }
            relative_path = $_.FullName.Substring($PayloadRoot.Length).TrimStart("\")
            size_bytes = [int64]$_.Length
            modified_at = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
        }
    }

$Rows | Export-Csv -LiteralPath $ManifestPath -NoTypeInformation -Encoding UTF8

$ServerRows = @($Rows | Where-Object payload -eq "server")
$ClientRows = @($Rows | Where-Object payload -eq "client")

$Summary = [ordered]@{
    schema_version = 1
    generated_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssK")
    total_files = @($Rows).Count
    total_bytes = [int64](($Rows | Measure-Object size_bytes -Sum).Sum)
    server = [ordered]@{
        files = $ServerRows.Count
        bytes = [int64](($ServerRows | Measure-Object size_bytes -Sum).Sum)
    }
    client = [ordered]@{
        files = $ClientRows.Count
        bytes = [int64](($ClientRows | Measure-Object size_bytes -Sum).Sum)
    }
    checksum_policy = "Deferred to final package build"
}

[IO.File]::WriteAllText($SummaryPath, ($Summary | ConvertTo-Json -Depth 10), $Utf8)
Write-Host "PAYLOAD MANIFEST: PASS - $(@($Rows).Count) files" -ForegroundColor Green