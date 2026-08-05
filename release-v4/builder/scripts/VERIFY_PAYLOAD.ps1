param(
    [string]$ReleaseRoot = "D:\archive-management\release-v4"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ServerRoot = Join-Path $ReleaseRoot "payload\server"
$ClientRoot = Join-Path $ReleaseRoot "payload\client"
$Failures = New-Object System.Collections.Generic.List[string]

$Required = @(
    (Join-Path $ServerRoot "payload.json"),
    (Join-Path $ServerRoot "app\api\manage.py"),
    (Join-Path $ServerRoot "app\api\requirements.txt"),
    (Join-Path $ServerRoot "app\web\package.json"),
    (Join-Path $ServerRoot "data-template\media\.keep"),
    (Join-Path $ClientRoot "payload.json"),
    (Join-Path $ClientRoot "launcher\OPEN_QUAN_LY_KHO.ps1"),
    (Join-Path $ClientRoot "config-template\client.json.template"),
    (Join-Path $ReleaseRoot "manifest\payload-manifest.csv"),
    (Join-Path $ReleaseRoot "manifest\payload-summary.json")
)

foreach ($Path in $Required) {
    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        Write-Host "[PASS] $Path" -ForegroundColor Green
    }
    else {
        Write-Host "[FAIL] $Path" -ForegroundColor Red
        $Failures.Add("Missing: $Path")
    }
}

$ForbiddenNames = @(".venv", "venv", "node_modules", ".next", ".git", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache")
foreach ($Root in @($ServerRoot, $ClientRoot)) {
    foreach ($Name in $ForbiddenNames) {
        $Found = Get-ChildItem -LiteralPath $Root -Directory -Recurse -Force -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -ieq $Name }
        foreach ($Item in $Found) {
            Write-Host "[FAIL] Forbidden payload directory: $($Item.FullName)" -ForegroundColor Red
            $Failures.Add("Forbidden directory: $($Item.FullName)")
        }
    }
}

$CopiedMediaFiles = Get-ChildItem -LiteralPath (Join-Path $ServerRoot "app\api") -File -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match "\\media\\" }

if (@($CopiedMediaFiles).Count -gt 0) {
    $Failures.Add("Current user media was copied into application payload")
    Write-Host "[FAIL] Current user media exists inside app payload" -ForegroundColor Red
}
else {
    Write-Host "[PASS] Current user media is excluded" -ForegroundColor Green
}

if ($Failures.Count -gt 0) {
    foreach ($Failure in $Failures) { Write-Host "[FAIL] $Failure" -ForegroundColor Red }
    throw "PAYLOAD VERIFY: FAIL"
}

Write-Host "PAYLOAD VERIFY: PASS" -ForegroundColor Green