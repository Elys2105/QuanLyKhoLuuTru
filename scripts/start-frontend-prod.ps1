$ErrorActionPreference = "Stop"

Set-Location "D:\archive-management\web"

if (!(Test-Path ".next")) {
    Write-Host "Chua co production build. Dang chay npm run build..." -ForegroundColor Yellow
    npm run build
}

npm run start