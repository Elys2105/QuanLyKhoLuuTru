$ErrorActionPreference = "Stop"

Write-Host "Dang kiem tra port..." -ForegroundColor Cyan
powershell -ExecutionPolicy Bypass -File "D:\archive-management\scripts\check-ports.ps1"

Write-Host "Dang mo backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "D:\archive-management\scripts\start-backend.ps1"

Start-Sleep -Seconds 6

Write-Host "Dang mo frontend production..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "D:\archive-management\scripts\start-frontend-prod.ps1"

Start-Sleep -Seconds 8

Write-Host "Dang mo ung dung..." -ForegroundColor Cyan
Start-Process "http://localhost:3000"