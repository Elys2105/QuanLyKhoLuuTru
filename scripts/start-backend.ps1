$ErrorActionPreference = "Stop"

Set-Location "D:\archive-management\api"

if (!(Test-Path ".\.venv\Scripts\Activate.ps1")) {
    Write-Host "Khong tim thay venv backend: D:\archive-management\api\.venv" -ForegroundColor Red
    Read-Host "Nhan Enter de thoat"
    exit 1
}

.\.venv\Scripts\Activate.ps1

python manage.py check

python manage.py runserver 127.0.0.1:8000