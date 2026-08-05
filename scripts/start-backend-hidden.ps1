$ErrorActionPreference = "Stop"

Set-Location "D:\archive-management\api"

if (!(Test-Path ".\.venv\Scripts\python.exe")) {
    throw "Khong tim thay backend python: D:\archive-management\api\.venv\Scripts\python.exe"
}

.\.venv\Scripts\python.exe manage.py check

.\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000