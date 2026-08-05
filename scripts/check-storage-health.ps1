$ErrorActionPreference = "Stop"

$storageRoot = [Environment]::GetEnvironmentVariable("ARCHIVE_STORAGE_ROOT", "User")

if ([string]::IsNullOrWhiteSpace($storageRoot)) {
    $storageRoot = "D:\archive-management\api\media"
}

if (!(Test-Path $storageRoot)) {
    New-Item -ItemType Directory -Force -Path $storageRoot | Out-Null
}

$drive = Split-Path -Qualifier $storageRoot
$driveName = $drive.TrimEnd(":\")

$psDrive = Get-PSDrive $driveName

$total = $psDrive.Used + $psDrive.Free
$freeGb = [math]::Round($psDrive.Free / 1GB, 2)
$totalGb = [math]::Round($total / 1GB, 2)
$usedGb = [math]::Round($psDrive.Used / 1GB, 2)
$freePercent = if ($total -gt 0) { [math]::Round(($psDrive.Free / $total) * 100, 2) } else { 0 }

Write-Host "Storage root : $storageRoot" -ForegroundColor Cyan
Write-Host "Drive        : $drive"
Write-Host "Total        : $totalGb GB"
Write-Host "Used         : $usedGb GB"
Write-Host "Free         : $freeGb GB"
Write-Host "Free percent : $freePercent%"

if ($totalGb -lt 500) {
    Write-Host "CANH BAO: O luu tru hien tai nho hon 500GB." -ForegroundColor Yellow
} else {
    Write-Host "OK: O luu tru dat moc 500GB tro len." -ForegroundColor Green
}

if ($totalGb -ge 1024) {
    Write-Host "OK: O luu tru dat moc 1TB tro len." -ForegroundColor Green
}
